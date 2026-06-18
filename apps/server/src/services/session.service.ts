import { Session, type ISession } from '../models';

/**
 * Create or update session when device connects
 */
export async function createSession(
  deviceCode: string,
  socketId: string,
  connectionMode: 'local' | 'remote' = 'remote'
): Promise<ISession> {
  // Remove any existing session for this device
  await Session.deleteMany({ deviceCode });

  const session = await Session.create({
    deviceCode,
    socketId,
    connectionMode,
    connectedAt: new Date(),
    lastActive: new Date(),
    isOnline: true,
  });

  return session;
}

/**
 * Remove session when device disconnects
 */
export async function removeSession(socketId: string): Promise<string | null> {
  const session = await Session.findOneAndDelete({ socketId });
  return session?.deviceCode || null;
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(deviceCode: string): Promise<void> {
  await Session.updateOne({ deviceCode, isOnline: true }, { lastActive: new Date() });
}

/**
 * Get online session for a device
 */
export async function getDeviceSession(deviceCode: string): Promise<ISession | null> {
  return Session.findOne({ deviceCode, isOnline: true });
}

/**
 * Check if a device is online
 */
export async function isDeviceOnline(deviceCode: string): Promise<boolean> {
  const session = await Session.findOne({ deviceCode, isOnline: true });
  return !!session;
}

/**
 * Get all online paired devices for a given device code
 */
export async function getOnlinePairedDevices(
  deviceCode: string,
  pairedDeviceCodes: string[]
): Promise<ISession[]> {
  return Session.find({
    deviceCode: { $in: pairedDeviceCodes },
    isOnline: true,
  });
}

/**
 * Cleanup stale sessions (older than 30 minutes without activity)
 */
export async function cleanupStaleSessions(): Promise<number> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const result = await Session.deleteMany({
    lastActive: { $lt: thirtyMinutesAgo },
  });
  return result.deletedCount;
}
