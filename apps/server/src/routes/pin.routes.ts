import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest, validate } from '../middleware';

const router = Router();

// In-memory PIN store (short-lived, expires in 2 minutes)
const pinStore = new Map<
  string,
  {
    deviceCode: string;
    deviceName: string;
    deviceType: string;
    publicKey: string;
    createdAt: number;
    expiresAt: number;
  }
>();

// Cleanup expired PINs every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [pin, data] of pinStore) {
    if (now > data.expiresAt) {
      pinStore.delete(pin);
    }
  }
}, 30000);

const registerPINSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
  deviceName: z.string().min(1).max(50),
  deviceType: z.enum(['desktop', 'mobile', 'web']),
  publicKey: z.string().min(1),
});

const verifyPINSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
});

/**
 * POST /api/pairing/pin/register
 * Register a PIN for pairing (source device)
 */
router.post(
  '/pin/register',
  authenticate,
  validate(registerPINSchema),
  async (req: AuthRequest, res: Response) => {
    const { pin, deviceName, deviceType, publicKey } = req.body;

    // Check if PIN already in use
    if (pinStore.has(pin)) {
      res.status(409).json({ error: 'PIN already in use, try generating a new one' });
      return;
    }

    const now = Date.now();
    pinStore.set(pin, {
      deviceCode: req.deviceCode!,
      deviceName,
      deviceType,
      publicKey,
      createdAt: now,
      expiresAt: now + 2 * 60 * 1000, // 2 minutes
    });

    res.json({ success: true, expiresAt: now + 2 * 60 * 1000 });
  }
);

/**
 * POST /api/pairing/pin/verify
 * Verify a PIN and get peer device info (scanning device)
 */
router.post(
  '/pin/verify',
  authenticate,
  validate(verifyPINSchema),
  async (req: AuthRequest, res: Response) => {
    const { pin } = req.body;

    const data = pinStore.get(pin);
    if (!data) {
      res.status(404).json({ error: 'Invalid or expired PIN' });
      return;
    }

    if (Date.now() > data.expiresAt) {
      pinStore.delete(pin);
      res.status(410).json({ error: 'PIN has expired' });
      return;
    }

    // Don't let a device pair with itself
    if (data.deviceCode === req.deviceCode) {
      res.status(400).json({ error: 'Cannot pair with yourself' });
      return;
    }

    // Return peer device info (PIN remains valid until expiry for retry)
    res.json({
      success: true,
      data: {
        deviceCode: data.deviceCode,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        publicKey: data.publicKey,
      },
    });
  }
);

/**
 * DELETE /api/pairing/pin/:pin
 * Cancel/revoke a registered PIN
 */
router.delete('/pin/:pin', authenticate, async (req: AuthRequest, res: Response) => {
  const pin = req.params.pin as string;
  const data = pinStore.get(pin);

  if (!data || data.deviceCode !== req.deviceCode) {
    res.status(404).json({ error: 'PIN not found' });
    return;
  }

  pinStore.delete(pin);
  res.json({ success: true });
});

export default router;
