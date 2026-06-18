import {
  Permission,
  Pairing,
  type IPermission,
  type PermissionType,
  type PermissionDirection,
} from '../models';

/**
 * Get all permissions for a pairing
 */
export async function getPairingPermissions(pairingId: string): Promise<IPermission[]> {
  return Permission.find({ pairingId });
}

/**
 * Update a specific permission
 */
export async function updatePermission(
  pairingId: string,
  permissionType: PermissionType,
  direction: PermissionDirection,
  granted: boolean,
  grantedBy: string
): Promise<IPermission> {
  // Verify the device is part of this pairing
  const pairing = await Pairing.findById(pairingId);
  if (!pairing) throw new Error('Pairing not found');
  if (pairing.status !== 'active') throw new Error('Pairing is not active');

  if (pairing.deviceACode !== grantedBy && pairing.deviceBCode !== grantedBy) {
    throw new Error('Device is not part of this pairing');
  }

  const permission = await Permission.findOneAndUpdate(
    { pairingId, permissionType, direction },
    {
      granted,
      grantedBy,
      grantedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return permission;
}

/**
 * Check if a device has a specific permission for a given pairing
 */
export async function checkPermission(
  pairingId: string,
  permissionType: PermissionType,
  fromDeviceCode: string
): Promise<boolean> {
  const pairing = await Pairing.findById(pairingId);
  if (!pairing || pairing.status !== 'active') return false;

  // Determine direction based on which device is asking
  let directions: PermissionDirection[];
  if (pairing.deviceACode === fromDeviceCode) {
    directions = ['a_to_b', 'bidirectional'];
  } else if (pairing.deviceBCode === fromDeviceCode) {
    directions = ['b_to_a', 'bidirectional'];
  } else {
    return false;
  }

  const permission = await Permission.findOne({
    pairingId,
    permissionType,
    direction: { $in: directions },
    granted: true,
  });

  return !!permission;
}

/**
 * Set bulk permissions for a pairing (used during setup)
 */
export async function setBulkPermissions(
  pairingId: string,
  permissions: {
    permissionType: PermissionType;
    direction: PermissionDirection;
    granted: boolean;
  }[],
  grantedBy: string
): Promise<IPermission[]> {
  const pairing = await Pairing.findById(pairingId);
  if (!pairing) throw new Error('Pairing not found');
  if (pairing.status !== 'active') throw new Error('Pairing is not active');

  if (pairing.deviceACode !== grantedBy && pairing.deviceBCode !== grantedBy) {
    throw new Error('Device is not part of this pairing');
  }

  const results: IPermission[] = [];

  for (const perm of permissions) {
    const updated = await Permission.findOneAndUpdate(
      {
        pairingId,
        permissionType: perm.permissionType,
        direction: perm.direction,
      },
      {
        granted: perm.granted,
        grantedBy,
        grantedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    results.push(updated);
  }

  return results;
}
