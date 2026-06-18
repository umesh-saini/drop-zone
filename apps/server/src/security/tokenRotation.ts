import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Token rotation strategy.
 *
 * - JWT tokens are valid for 30 days
 * - After 7 days, a new token is issued on each authenticated request
 * - Old token is still valid until expiry (no immediate revocation needed)
 * - On token refresh, the new token has a fresh 30-day expiry
 *
 * This provides a balance of security (shorter effective lifetime) and
 * convenience (user doesn't have to re-auth every day).
 */

const ROTATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if a token should be rotated (issued more than 7 days ago).
 */
export function shouldRotateToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { iat?: number } | null;
    if (!decoded?.iat) return false;

    const issuedAt = decoded.iat * 1000; // iat is in seconds
    return Date.now() - issuedAt > ROTATION_THRESHOLD_MS;
  } catch {
    return false;
  }
}

/**
 * Generate a fresh token (rotation).
 */
export function rotateToken(deviceCode: string, deviceId: string): string {
  return jwt.sign({ deviceCode, deviceId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

/**
 * Decode token and get its issued-at time.
 */
export function getTokenAge(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as { iat?: number } | null;
    if (!decoded?.iat) return null;
    return Date.now() - decoded.iat * 1000;
  } catch {
    return null;
  }
}
