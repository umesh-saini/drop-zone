import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Device } from '../models';

export interface AuthRequest extends Request {
  deviceCode?: string;
  deviceId?: string;
}

/**
 * Authenticate requests using JWT token
 * Token is passed in Authorization header as "Bearer <token>"
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      deviceCode: string;
      deviceId: string;
    };

    // Verify device still exists
    const device = await Device.findOne({ deviceCode: decoded.deviceCode });
    if (!device) {
      res.status(401).json({ error: 'Device not found' });
      return;
    }

    // Update last seen
    device.lastSeen = new Date();
    await device.save();

    req.deviceCode = decoded.deviceCode;
    req.deviceId = device._id.toString();

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
}
