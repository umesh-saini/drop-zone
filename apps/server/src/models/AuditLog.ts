import mongoose, { Schema, Document } from 'mongoose';

/**
 * AuditLog tracks security-relevant events.
 * Who did what, when, from where.
 */

export type AuditAction =
  | 'device_register'
  | 'device_login'
  | 'device_login_failed'
  | 'pairing_request'
  | 'pairing_accept'
  | 'pairing_reject'
  | 'pairing_revoke'
  | 'permission_update'
  | 'file_transfer'
  | 'remote_access'
  | 'token_refresh'
  | 'brute_force_blocked';

export interface IAuditLog extends Document {
  action: AuditAction;
  deviceCode: string | null;
  targetDeviceCode: string | null;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
  success: boolean;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    deviceCode: {
      type: String,
      default: null,
      index: true,
    },
    targetDeviceCode: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    success: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete logs older than 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
