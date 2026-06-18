import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform: 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'web';
  publicKey: string;
  secretToken: string; // hashed token for auth
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 8,
      maxlength: 8,
    },
    deviceName: {
      type: String,
      required: true,
      maxlength: 50,
    },
    deviceType: {
      type: String,
      required: true,
      enum: ['desktop', 'mobile', 'web'],
    },
    platform: {
      type: String,
      required: true,
      enum: ['windows', 'mac', 'linux', 'android', 'ios', 'web'],
    },
    publicKey: {
      type: String,
      required: true,
    },
    secretToken: {
      type: String,
      required: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
