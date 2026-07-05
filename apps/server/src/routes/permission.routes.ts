import { Router, Response } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import { authenticate, type AuthRequest, validate } from '../middleware';
import { permissionService } from '../services';
import { Pairing } from '../models';

const router = Router();

// All permission routes require authentication
router.use(authenticate);

/** Notify both devices in a pairing that permissions changed */
async function notifyPermissionUpdate(req: AuthRequest, pairingId: string): Promise<void> {
  const io = req.app.get('io') as Server | undefined;
  if (!io) return;
  const pairing = await Pairing.findById(pairingId);
  if (!pairing) return;
  for (const code of [pairing.deviceACode, pairing.deviceBCode]) {
    io.to(`device:${code}`).emit('permission:update', {
      pairingId,
      updatedBy: req.deviceCode,
    });
  }
}

const permissionTypeEnum = z.enum([
  'clipboard_read',
  'clipboard_write',
  'file_send',
  'file_receive',
  'file_access_read',
  'file_access_write',
  'notification_mirror',
  'terminal_access',
]);

const updatePermissionSchema = z.object({
  permissionType: permissionTypeEnum,
  granted: z.boolean(),
});

/**
 * GET /api/pairings/:pairingId/permissions
 * Returns ONLY the requesting device's own permissions (what this device
 * allows the other device to do to it).
 */
router.get('/:pairingId/permissions', async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await permissionService.getDevicePermissions(
      req.params.pairingId as string,
      req.deviceCode!
    );

    res.json({
      success: true,
      data: permissions.map((p) => ({
        id: p._id,
        permissionType: p.permissionType,
        ownerDevice: p.ownerDevice,
        granted: p.granted,
        grantedAt: p.grantedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pairings/:pairingId/peer-permissions
 * Returns the permissions the OTHER device has granted to this device.
 */
router.get('/:pairingId/peer-permissions', async (req: AuthRequest, res: Response) => {
  try {
    const pairingId = req.params.pairingId;
    const myDeviceCode = req.deviceCode!;

    // Get the pairing to find the peer's device code
    const pairing = await Pairing.findById(pairingId);
    if (!pairing) {
      res.status(404).json({ error: 'Pairing not found' });
      return;
    }

    if (pairing.deviceACode !== myDeviceCode && pairing.deviceBCode !== myDeviceCode) {
      res.status(403).json({ error: 'Not part of this pairing' });
      return;
    }

    const peerDeviceCode = pairing.deviceACode === myDeviceCode ? pairing.deviceBCode : pairing.deviceACode;

    const permissions = await permissionService.getDevicePermissions(
      pairingId,
      peerDeviceCode
    );

    res.json({
      success: true,
      data: permissions.map((p) => ({
        id: p._id,
        permissionType: p.permissionType,
        ownerDevice: p.ownerDevice,
        granted: p.granted,
        grantedAt: p.grantedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pairings/:pairingId/permissions
 * Update a permission owned by the requesting device.
 */
router.put(
  '/:pairingId/permissions',
  validate(updatePermissionSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { permissionType, granted } = req.body;

      const permission = await permissionService.updatePermission(
        req.params.pairingId as string,
        permissionType,
        granted,
        req.deviceCode!
      );

      await notifyPermissionUpdate(req, req.params.pairingId as string);

      res.json({
        success: true,
        data: {
          id: permission._id,
          permissionType: permission.permissionType,
          ownerDevice: permission.ownerDevice,
          granted: permission.granted,
          grantedAt: permission.grantedAt,
        },
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
);

export default router;
