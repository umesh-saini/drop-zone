import mongoose, { Schema, Document } from 'mongoose';

export type PermissionType =
  | 'clipboard_read'
  | 'clipboard_write'
  | 'file_send'
  | 'file_receive'
  | 'file_access_read'
  | 'file_access_write'
  | 'notification_mirror';

export type PermissionDirection = 'a_to_b' | 'b_to_a' | 'bidirectional';

export interface IPermission extends Document {
  pairingId: mongoose.Types.ObjectId;
  permissionType: PermissionType;
  direction: PermissionDirection;
  granted: boolean;
  grantedBy: string; // device code of who granted
  grantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    pairingId: {
      type: Schema.Types.ObjectId,
      ref: 'Pairing',
      required: true,
      index: true,
    },
    permissionType: {
      type: String,
      required: true,
      enum: [
        'clipboard_read',
        'clipboard_write',
        'file_send',
        'file_receive',
        'file_access_read',
        'file_access_write',
        'notification_mirror',
      ],
    },
    direction: {
      type: String,
      required: true,
      enum: ['a_to_b', 'b_to_a', 'bidirectional'],
    },
    granted: {
      type: Boolean,
      required: true,
      default: false,
    },
    grantedBy: {
      type: String,
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A pairing can only have one permission entry per type+direction
PermissionSchema.index({ pairingId: 1, permissionType: 1, direction: 1 }, { unique: true });

export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
