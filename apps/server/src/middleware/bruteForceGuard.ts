import { Request, Response, NextFunction } from 'express';
import { isBlocked, getBlockRemaining } from '../security';
import { getClientIP } from '../security';

/**
 * Middleware to block brute-force attempts.
 * Applied to login and pairing verification endpoints.
 */
export function bruteForceGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);

  if (isBlocked(ip)) {
    const remaining = getBlockRemaining(ip);
    res.status(429).json({
      error: 'Too many failed attempts. Please try again later.',
      retryAfter: remaining,
    });
    return;
  }

  next();
}
