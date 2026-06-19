import { Pairing, Permission, Device, type IPairing } from '../models';
import type { PermissionType, PermissionDirection } from '../models';

/**
 * Create a pairing request from device A to device B
 */
export async function createPairingRequest(
  deviceACode: string,
  deviceBCode: string
): Promise<IPairing> {
  // Verify both devices exist
  const [deviceA, deviceB] = await Promise.all([
    Device.findOne({ deviceCode: deviceACode }),
    Device.findOne({ deviceCode: deviceBCode }),
  ]);

  if (!deviceA) throw new Error('Source device not found');
  if (!deviceB) throw new Error('Target device not found');
  if (deviceACode === deviceBCode) throw new Error('Cannot pair device with itself');

  // Normalize the order to prevent duplicate pairings (A-B and B-A)
  const [normalA, normalB] =
    deviceACode < deviceBCode ? [deviceACode, deviceBCode] : [deviceBCode, deviceACode];

  // Check if an active/pending pairing already exists
  const existing = await Pairing.findOne({
    deviceACode: normalA,
    deviceBCode: normalB,
    status: { $ne: 'revoked' },
  });

  if (existing) {
    if (existing.status === 'active') {
      throw new Error('Devices are already paired');
    }
    if (existing.status === 'pending') {
      throw new Error('Pairing request already pending');
    }
  }

  // Remove any leftover 'revoked' record for these two devices so the unique
  // index doesn't block creating a fresh pairing (defensive for old data).
  await Pairing.deleteMany({
    deviceACode: normalA,
    deviceBCode: normalB,
    status: 'revoked',
  });

  const pairing = await Pairing.create({
    deviceACode: normalA,
    deviceBCode: normalB,
    initiatedBy: deviceACode,
    status: 'pending',
  });

  return pairing;
}

/**
 * Accept a pending pairing request
 */
export async function acceptPairing(pairingId: string, deviceCode: string): Promise<IPairing> {
  const pairing = await Pairing.findById(pairingId);

  if (!pairing) throw new Error('Pairing not found');
  if (pairing.status !== 'pending') throw new Error('Pairing is not pending');

  // Verify the accepting device is part of this pairing
  if (pairing.deviceACode !== deviceCode && pairing.deviceBCode !== deviceCode) {
    throw new Error('Device is not part of this pairing');
  }

  // The initiator cannot accept their own request — only the recipient can
  if (pairing.initiatedBy === deviceCode) {
    throw new Error('Cannot accept your own pairing request');
  }

  pairing.status = 'active';
  pairing.pairedAt = new Date();
  await pairing.save();

  // Create default permissions (clipboard sync both ways)
  const defaultPermissions: {
    permissionType: PermissionType;
    direction: PermissionDirection;
    granted: boolean;
  }[] = [
    { permissionType: 'clipboard_read', direction: 'bidirectional', granted: true },
    { permissionType: 'clipboard_write', direction: 'bidirectional', granted: true },
    { permissionType: 'file_send', direction: 'bidirectional', granted: true },
    { permissionType: 'file_receive', direction: 'bidirectional', granted: true },
    { permissionType: 'file_access_read', direction: 'bidirectional', granted: false },
    { permissionType: 'file_access_write', direction: 'bidirectional', granted: false },
    { permissionType: 'notification_mirror', direction: 'bidirectional', granted: false },
  ];

  await Permission.insertMany(
    defaultPermissions.map((p) => ({
      pairingId: pairing._id,
      ...p,
      grantedBy: deviceCode,
      grantedAt: new Date(),
    }))
  );

  return pairing;
}

/**
 * Reject a pending pairing request
 */
export async function rejectPairing(pairingId: string, deviceCode: string): Promise<void> {
  const pairing = await Pairing.findById(pairingId);

  if (!pairing) throw new Error('Pairing not found');
  if (pairing.status !== 'pending') throw new Error('Pairing is not pending');

  if (pairing.deviceACode !== deviceCode && pairing.deviceBCode !== deviceCode) {
    throw new Error('Device is not part of this pairing');
  }

  // Just delete the pending request
  await pairing.deleteOne();
}

/**
 * Revoke an active pairing (or cancel a pending one).
 * Returns the peer device code so the caller can notify them.
 */
export async function revokePairing(pairingId: string, deviceCode: string): Promise<string> {
  const pairing = await Pairing.findById(pairingId);

  if (!pairing) throw new Error('Pairing not found');
  if (pairing.status === 'revoked') throw new Error('Pairing already revoked');

  if (pairing.deviceACode !== deviceCode && pairing.deviceBCode !== deviceCode) {
    throw new Error('Device is not part of this pairing');
  }

  const peerCode = pairing.deviceACode === deviceCode ? pairing.deviceBCode : pairing.deviceACode;

  // Remove all permissions for this pairing
  await Permission.deleteMany({ pairingId: pairing._id });

  // Fully delete the pairing so the same two devices can pair again later
  // (a lingering 'revoked' row would collide with the unique index).
  await pairing.deleteOne();

  return peerCode;
}

/**
 * Get all pairings for a device
 */
export async function getDevicePairings(deviceCode: string): Promise<IPairing[]> {
  return Pairing.find({
    $or: [{ deviceACode: deviceCode }, { deviceBCode: deviceCode }],
    status: { $ne: 'revoked' },
  });
}

/**
 * Get pending pairing requests for a device
 */
export async function getPendingPairings(deviceCode: string): Promise<IPairing[]> {
  return Pairing.find({
    $or: [{ deviceACode: deviceCode }, { deviceBCode: deviceCode }],
    status: 'pending',
  });
}
