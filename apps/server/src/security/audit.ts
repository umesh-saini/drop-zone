import { Request } from 'express';
import { AuditLog, type AuditAction } from '../models';

/**
 * Audit logging service.
 * Records security-relevant events for later review.
 */

/**
 * Log an audit event.
 */
export async function logAuditEvent(
  action: AuditAction,
  options: {
    deviceCode?: string | null;
    targetDeviceCode?: string | null;
    ip: string;
    userAgent?: string;
    details?: Record<string, any>;
    success?: boolean;
  }
): Promise<void> {
  try {
    await AuditLog.create({
      action,
      deviceCode: options.deviceCode || null,
      targetDeviceCode: options.targetDeviceCode || null,
      ip: options.ip,
      userAgent: options.userAgent || '',
      details: options.details || {},
      success: options.success ?? true,
    });
  } catch (error) {
    // Don't let audit logging failures break the app
    console.error('[Audit] Failed to log event:', error);
  }
}

/**
 * Extract client IP from request (handles proxies).
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Log audit event from Express request context.
 */
export async function logFromRequest(
  req: Request,
  action: AuditAction,
  options: {
    deviceCode?: string | null;
    targetDeviceCode?: string | null;
    details?: Record<string, any>;
    success?: boolean;
  } = {}
): Promise<void> {
  await logAuditEvent(action, {
    ...options,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'] || '',
  });
}
