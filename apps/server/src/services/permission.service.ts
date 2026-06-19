import { Permission, Pairing, type IPermission, type PermissionType } from '../models';

/**
 * Get all permissions for a pairing owned by a specific device.
 * Each device only sees/controls its own permission set.
 */
export async function getDevicePermissions(
  pairingId: string,
  ownerDevice: string
): Promise<IPermission[]> {
  return Permission.find({ pairingId, ownerDevice });
}

/**
 * Get all permissions for a pairing (both devices) — used internally.
 */
export async function getPairingPermissions(pairingId: string): Promise<IPermission[]> {
  return Permission.find({ pairingId });
}

/**
 * Update a permission owned by `ownerDevice`.
 * A device can only change permissions it owns (what others may do to it).
 */
export async function updatePermission(
  pairingId: string,
  permissionType: PermissionType,
  granted: boolean,
  ownerDevice: string
): Promise<IPermission> {
  const pairing = await Pairing.findById(pairingId);
  if (!pairing) throw new Error('Pairing not found');
  if (pairing.status !== 'active') throw new Error('Pairing is not active');

  if (pairing.deviceACode !== ownerDevice && pairing.deviceBCode !== ownerDevice) {
    throw new Error('Device is not part of this pairing');
  }

  const permission = await Permission.findOneAndUpdate(
    { pairingId, permissionType, ownerDevice },
    { granted, grantedAt: new Date() },
    { upsert: true, new: true }
  );

  return permission;
}

/**
 * Check whether `ownerDevice` allows the OTHER device to perform
 * `permissionType` toward it (i.e. the resource owner's setting).
 *
 * Example: X pushes clipboard to Y → check checkPermission(pairing, 'clipboard_write', Y)
 *          (does Y accept incoming clipboard writes?)
 */
export async function checkPermission(
  pairingId: string,
  permissionType: PermissionType,
  ownerDevice: string
): Promise<boolean> {
  const pairing = await Pairing.findById(pairingId);
  if (!pairing || pairing.status !== 'active') return false;

  if (pairing.deviceACode !== ownerDevice && pairing.deviceBCode !== ownerDevice) {
    return false;
  }

  const permission = await Permission.findOne({
    pairingId,
    permissionType,
    ownerDevice,
    granted: true,
  });

  return !!permission;
}

/**
 * Create the default permission set for BOTH devices on a new pairing.
 * Each device gets its own independent set.
 */
export async function createDefaultPermissions(
  pairingId: string,
  deviceCodes: string[]
): Promise<void> {
  const defaults: { permissionType: PermissionType; granted: boolean }[] = [
    { permissionType: 'clipboard_read', granted: true },
    { permissionType: 'clipboard_write', granted: true },
    { permissionType: 'file_send', granted: true },
    { permissionType: 'file_receive', granted: true },
    { permissionType: 'file_access_read', granted: false },
    { permissionType: 'file_access_write', granted: false },
    { permissionType: 'notification_mirror', granted: false },
  ];

  const docs = [];
  for (const ownerDevice of deviceCodes) {
    for (const d of defaults) {
      docs.push({
        pairingId,
        permissionType: d.permissionType,
        ownerDevice,
        granted: d.granted,
        grantedAt: new Date(),
      });
    }
  }
  await Permission.insertMany(docs);
}
