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

const updatePermissionSchema = z.object({
  permissionType: z.enum([
    'clipboard_read',
    'clipboard_write',
    'file_send',
    'file_receive',
    'file_access_read',
    'file_access_write',
    'notification_mirror',
  ]),
  direction: z.enum(['a_to_b', 'b_to_a', 'bidirectional']),
  granted: z.boolean(),
});

const bulkPermissionSchema = z.object({
  permissions: z.array(
    z.object({
      permissionType: z.enum([
        'clipboard_read',
        'clipboard_write',
        'file_send',
        'file_receive',
        'file_access_read',
        'file_access_write',
        'notification_mirror',
      ]),
      direction: z.enum(['a_to_b', 'b_to_a', 'bidirectional']),
      granted: z.boolean(),
    })
  ),
});

/**
 * GET /api/pairings/:pairingId/permissions
 * Get all permissions for a pairing
 */
router.get('/:pairingId/permissions', async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await permissionService.getPairingPermissions(
      req.params.pairingId as string
    );

    res.json({
      success: true,
      data: permissions.map((p) => ({
        id: p._id,
        permissionType: p.permissionType,
        direction: p.direction,
        granted: p.granted,
        grantedBy: p.grantedBy,
        grantedAt: p.grantedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/pairings/:pairingId/permissions
 * Update a single permission for a pairing
 */
router.put(
  '/:pairingId/permissions',
  validate(updatePermissionSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { permissionType, direction, granted } = req.body;

      const permission = await permissionService.updatePermission(
        req.params.pairingId as string,
        permissionType,
        direction,
        granted,
        req.deviceCode!
      );

      await notifyPermissionUpdate(req, req.params.pairingId as string);

      res.json({
        success: true,
        data: {
          id: permission._id,
          permissionType: permission.permissionType,
          direction: permission.direction,
          granted: permission.granted,
          grantedBy: permission.grantedBy,
          grantedAt: permission.grantedAt,
        },
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/pairings/:pairingId/permissions/bulk
 * Update multiple permissions at once
 */
router.put(
  '/:pairingId/permissions/bulk',
  validate(bulkPermissionSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const results = await permissionService.setBulkPermissions(
        req.params.pairingId as string,
        req.body.permissions,
        req.deviceCode!
      );

      res.json({
        success: true,
        data: results.map((p) => ({
          id: p._id,
          permissionType: p.permissionType,
          direction: p.direction,
          granted: p.granted,
          grantedBy: p.grantedBy,
          grantedAt: p.grantedAt,
        })),
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
);

/**
 * GET /api/pairings/:pairingId/permissions/check
 * Check if current device has a specific permission
 */
router.get('/:pairingId/permissions/check', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: 'Query param "type" is required' });
      return;
    }

    const hasPermission = await permissionService.checkPermission(
      req.params.pairingId as string,
      type as any,
      req.deviceCode!
    );

    res.json({
      success: true,
      data: { hasPermission },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
