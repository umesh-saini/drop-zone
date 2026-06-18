import mongoose, { Schema, Document } from 'mongoose';

export interface IPairing extends Document {
  deviceACode: string;
  deviceBCode: string;
  status: 'pending' | 'active' | 'revoked';
  pairedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PairingSchema = new Schema<IPairing>(
  {
    deviceACode: {
      type: String,
      required: true,
      index: true,
    },
    deviceBCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'revoked'],
      default: 'pending',
    },
    pairedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique pairing between two devices
PairingSchema.index({ deviceACode: 1, deviceBCode: 1 }, { unique: true });

export const Pairing = mongoose.model<IPairing>('Pairing', PairingSchema);
