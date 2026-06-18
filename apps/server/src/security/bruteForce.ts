/**
 * Brute-force protection for device code guessing and login attempts.
 *
 * Strategy:
 * - Track failed attempts per IP
 * - After 5 failures in 15 minutes: block for 15 minutes
 * - After 10 failures in 1 hour: block for 1 hour
 * - After 20 failures in 24 hours: block for 24 hours
 *
 * Uses in-memory store (for single instance) — swap for Redis in production.
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();

// Thresholds
const THRESHOLDS = [
  { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 }, // 5 in 15min → block 15min
  { maxAttempts: 10, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 }, // 10 in 1h → block 1h
  { maxAttempts: 20, windowMs: 24 * 60 * 60 * 1000, blockMs: 24 * 60 * 60 * 1000 }, // 20 in 24h → block 24h
];

/**
 * Check if an IP is currently blocked.
 */
export function isBlocked(ip: string): boolean {
  const record = attempts.get(ip);
  if (!record || !record.blockedUntil) return false;

  if (Date.now() >= record.blockedUntil) {
    // Block expired — clear
    attempts.delete(ip);
    return false;
  }

  return true;
}

/**
 * Record a failed attempt from an IP.
 * Returns the block duration in seconds if now blocked, or 0 if not blocked.
 */
export function recordFailedAttempt(ip: string): number {
  const now = Date.now();
  let record = attempts.get(ip);

  if (!record) {
    record = { count: 0, firstAttempt: now, lastAttempt: now, blockedUntil: null };
    attempts.set(ip, record);
  }

  record.count++;
  record.lastAttempt = now;

  // Check against thresholds (highest first)
  for (const threshold of [...THRESHOLDS].reverse()) {
    if (record.count >= threshold.maxAttempts && now - record.firstAttempt <= threshold.windowMs) {
      record.blockedUntil = now + threshold.blockMs;
      return Math.floor(threshold.blockMs / 1000);
    }
  }

  return 0;
}

/**
 * Record a successful attempt (clears the failure count for the IP).
 */
export function recordSuccess(ip: string): void {
  attempts.delete(ip);
}

/**
 * Get current block remaining time for an IP (seconds), or 0 if not blocked.
 */
export function getBlockRemaining(ip: string): number {
  const record = attempts.get(ip);
  if (!record?.blockedUntil) return 0;

  const remaining = record.blockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Cleanup expired entries (run periodically).
 */
export function cleanupExpired(): void {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    // Remove entries older than 24 hours with no active block
    if (!record.blockedUntil && now - record.lastAttempt > 24 * 60 * 60 * 1000) {
      attempts.delete(ip);
    }
    // Remove expired blocks
    if (record.blockedUntil && now >= record.blockedUntil) {
      attempts.delete(ip);
    }
  }
}

// Cleanup every 10 minutes
setInterval(cleanupExpired, 10 * 60 * 1000);
