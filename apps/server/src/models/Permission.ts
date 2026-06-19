import mongoose, { Schema, Document } from 'mongoose';

export type PermissionType =
  | 'clipboard_read'
  | 'clipboard_write'
  | 'file_send'
  | 'file_receive'
  | 'file_access_read'
  | 'file_access_write'
  | 'notification_mirror';

export interface IPermission extends Document {
  pairingId: mongoose.Types.ObjectId;
  permissionType: PermissionType;
  /**
   * The device that OWNS this setting (the resource owner / target).
   * It controls whether the OTHER device may perform `permissionType`
   * toward this device. Each device has its own independent set.
   */
  ownerDevice: string;
  granted: boolean;
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
    ownerDevice: {
      type: String,
      required: true,
    },
    granted: {
      type: Boolean,
      required: true,
      default: false,
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

// One permission entry per (pairing, type, owner device)
PermissionSchema.index({ pairingId: 1, permissionType: 1, ownerDevice: 1 }, { unique: true });

export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
