import mongoose from 'mongoose';
import { Device, Pairing, Permission, Session, AuditLog } from '../models';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://umesh:umesh@192.168.29.225:27017/dropzone?authSource=admin&directConnection=true&replicaSet=rs0';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Sync indexes — drops obsolete indexes (e.g. old permission direction
    // index) and creates current ones so schema changes don't cause
    // duplicate-key collisions.
    await Promise.all([
      Device.syncIndexes(),
      Pairing.syncIndexes(),
      Permission.syncIndexes(),
      Session.syncIndexes(),
      AuditLog.syncIndexes(),
    ]);
    console.log('✅ Indexes synced');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});
