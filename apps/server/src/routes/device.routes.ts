import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, type AuthRequest, validate, bruteForceGuard } from '../middleware';
import { deviceService } from '../services';
import { logFromRequest, recordFailedAttempt, recordSuccess, getClientIP } from '../security';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  deviceName: z.string().min(1).max(50),
  deviceType: z.enum(['desktop', 'mobile', 'web']),
  platform: z.enum(['windows', 'mac', 'linux', 'android', 'ios', 'web']),
  publicKey: z.string().min(1),
});

const loginSchema = z.object({
  deviceCode: z.string().length(8),
  secretToken: z.string().min(1),
});

const updateSchema = z.object({
  deviceName: z.string().min(1).max(50).optional(),
  publicKey: z.string().min(1).optional(),
  fcmToken: z.string().optional(),
});

/**
 * POST /api/devices/register
 * Register a new device — returns device code + auth token
 */
router.post('/register', validate(registerSchema), async (req, res: Response) => {
  try {
    const { device, token, secretToken } = await deviceService.registerDevice(req.body);

    await logFromRequest(req, 'device_register', {
      deviceCode: device.deviceCode,
      details: { deviceName: device.deviceName, deviceType: device.deviceType },
    });

    res.status(201).json({
      success: true,
      data: {
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        platform: device.platform,
        token,
        secretToken, // Client must store this securely — used for re-authentication
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

/**
 * POST /api/devices/login
 * Authenticate existing device — returns new JWT
 * Protected by brute-force guard.
 */
router.post('/login', bruteForceGuard, validate(loginSchema), async (req, res: Response) => {
  try {
    const { deviceCode, secretToken } = req.body;
    const result = await deviceService.authenticateDevice(deviceCode, secretToken);

    if (!result) {
      const blockDuration = recordFailedAttempt(getClientIP(req));
      await logFromRequest(req, 'device_login_failed', {
        deviceCode,
        success: false,
        details: { blockedFor: blockDuration },
      });

      if (blockDuration > 0) {
        res.status(429).json({
          error: 'Too many failed attempts. Please try again later.',
          retryAfter: blockDuration,
        });
        return;
      }

      res.status(401).json({ error: 'Invalid device code or secret token' });
      return;
    }

    recordSuccess(getClientIP(req));
    await logFromRequest(req, 'device_login', { deviceCode: result.device.deviceCode });

    res.json({
      success: true,
      data: {
        deviceCode: result.device.deviceCode,
        deviceName: result.device.deviceName,
        token: result.token,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/**
 * GET /api/devices/me
 * Get current device info
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const device = await deviceService.getDeviceByCode(req.deviceCode!);

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        platform: device.platform,
        createdAt: device.createdAt,
        lastSeen: device.lastSeen,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/devices/me
 * Update current device info
 */
router.patch(
  '/me',
  authenticate,
  validate(updateSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const device = await deviceService.updateDevice(req.deviceCode!, req.body);

      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          deviceCode: device.deviceCode,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          platform: device.platform,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/devices/:code
 * Lookup a device by code (for pairing)
 */
router.get('/:code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const device = await deviceService.getDeviceByCode(req.params.code as string);

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    // Only return public info
    res.json({
      success: true,
      data: {
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        platform: device.platform,
        publicKey: device.publicKey,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
