import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  pairingId: mongoose.Types.ObjectId | null;
  deviceCode: string;
  socketId: string;
  connectionMode: 'local' | 'remote';
  connectedAt: Date;
  lastActive: Date;
  isOnline: boolean;
}

const SessionSchema = new Schema<ISession>(
  {
    pairingId: {
      type: Schema.Types.ObjectId,
      ref: 'Pairing',
      default: null,
    },
    deviceCode: {
      type: String,
      required: true,
      index: true,
    },
    socketId: {
      type: String,
      required: true,
      unique: true,
    },
    connectionMode: {
      type: String,
      required: true,
      enum: ['local', 'remote'],
      default: 'remote',
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
