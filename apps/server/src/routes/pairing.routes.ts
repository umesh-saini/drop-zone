import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest, validate } from '../middleware';
import { pairingService } from '../services';

const router = Router();

// All pairing routes require authentication
router.use(authenticate);

const pairingRequestSchema = z.object({
  targetDeviceCode: z.string().length(8),
});

/**
 * POST /api/pairings/request
 * Send a pairing request to another device
 */
router.post('/request', validate(pairingRequestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const pairing = await pairingService.createPairingRequest(
      req.deviceCode!,
      req.body.targetDeviceCode
    );

    res.status(201).json({
      success: true,
      data: {
        pairingId: pairing._id,
        deviceACode: pairing.deviceACode,
        deviceBCode: pairing.deviceBCode,
        status: pairing.status,
      },
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/**
 * POST /api/pairings/:id/accept
 * Accept a pending pairing request
 */
router.post('/:id/accept', async (req: AuthRequest, res: Response) => {
  try {
    const pairing = await pairingService.acceptPairing(req.params.id as string, req.deviceCode!);

    res.json({
      success: true,
      data: {
        pairingId: pairing._id,
        deviceACode: pairing.deviceACode,
        deviceBCode: pairing.deviceBCode,
        status: pairing.status,
        pairedAt: pairing.pairedAt,
      },
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/**
 * POST /api/pairings/:id/reject
 * Reject a pending pairing request
 */
router.post('/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    await pairingService.rejectPairing(req.params.id as string, req.deviceCode!);

    res.json({ success: true, message: 'Pairing request rejected' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/**
 * POST /api/pairings/:id/revoke
 * Revoke an active pairing
 */
router.post('/:id/revoke', async (req: AuthRequest, res: Response) => {
  try {
    await pairingService.revokePairing(req.params.id as string, req.deviceCode!);

    res.json({ success: true, message: 'Pairing revoked' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

/**
 * GET /api/pairings
 * Get all pairings for current device
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pairings = await pairingService.getDevicePairings(req.deviceCode!);

    res.json({
      success: true,
      data: pairings.map((p) => ({
        pairingId: p._id,
        deviceACode: p.deviceACode,
        deviceBCode: p.deviceBCode,
        status: p.status,
        pairedAt: p.pairedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pairings/pending
 * Get pending pairing requests for current device
 */
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const pairings = await pairingService.getPendingPairings(req.deviceCode!);

    res.json({
      success: true,
      data: pairings.map((p) => ({
        pairingId: p._id,
        deviceACode: p.deviceACode,
        deviceBCode: p.deviceBCode,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
