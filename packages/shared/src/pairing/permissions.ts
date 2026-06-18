import type { PermissionDisplayItem } from './types';

/**
 * Permission UI display data.
 * Maps permission types to user-friendly labels, descriptions, and icons.
 */
export const PERMISSION_DISPLAY: Record<
  string,
  Omit<PermissionDisplayItem, 'direction' | 'granted'>
> = {
  clipboard_read: {
    permissionType: 'clipboard_read',
    label: 'Read Clipboard',
    description: 'Can read what you copy to your clipboard',
    icon: 'clipboard-copy',
  },
  clipboard_write: {
    permissionType: 'clipboard_write',
    label: 'Write Clipboard',
    description: 'Can update your clipboard with their copied content',
    icon: 'clipboard-paste',
  },
  file_send: {
    permissionType: 'file_send',
    label: 'Send Files',
    description: 'Can send files to this device',
    icon: 'upload',
  },
  file_receive: {
    permissionType: 'file_receive',
    label: 'Receive Files',
    description: 'Can receive files from this device',
    icon: 'download',
  },
  file_access_read: {
    permissionType: 'file_access_read',
    label: 'Browse Files',
    description: 'Can browse and view files on this device',
    icon: 'folder-open',
  },
  file_access_write: {
    permissionType: 'file_access_write',
    label: 'Modify Files',
    description: 'Can edit and delete files on this device',
    icon: 'file-edit',
  },
  notification_mirror: {
    permissionType: 'notification_mirror',
    label: 'Mirror Notifications',
    description: 'Can see your notifications on their device',
    icon: 'bell',
  },
};

/**
 * Get display info for all permission types.
 */
export function getAllPermissionDisplayItems(): Omit<
  PermissionDisplayItem,
  'direction' | 'granted'
>[] {
  return Object.values(PERMISSION_DISPLAY);
}

/**
 * Build permission display items for a given pairing direction.
 */
export function buildPermissionDisplay(
  permissions: { permissionType: string; direction: string; granted: boolean }[],
  viewingAsDeviceA: boolean
): PermissionDisplayItem[] {
  const items: PermissionDisplayItem[] = [];

  for (const perm of permissions) {
    const display = PERMISSION_DISPLAY[perm.permissionType];
    if (!display) continue;

    // For bidirectional permissions, show once
    // For directional, translate based on which device we are
    let relevantDirection: 'a_to_b' | 'b_to_a' | 'bidirectional';
    if (perm.direction === 'bidirectional') {
      relevantDirection = 'bidirectional';
    } else if (perm.direction === 'a_to_b') {
      relevantDirection = viewingAsDeviceA ? 'a_to_b' : 'b_to_a';
    } else {
      relevantDirection = viewingAsDeviceA ? 'b_to_a' : 'a_to_b';
    }

    items.push({
      ...display,
      direction: relevantDirection,
      granted: perm.granted,
    });
  }

  return items;
}

/**
 * Get a human-readable direction label.
 */
export function getDirectionLabel(
  direction: 'a_to_b' | 'b_to_a' | 'bidirectional',
  myDeviceName: string,
  theirDeviceName: string
): string {
  switch (direction) {
    case 'a_to_b':
      return `${myDeviceName} → ${theirDeviceName}`;
    case 'b_to_a':
      return `${theirDeviceName} → ${myDeviceName}`;
    case 'bidirectional':
      return 'Both ways';
  }
}

/**
 * Default permissions granted on new pairing.
 */
export const DEFAULT_PERMISSIONS = [
  { permissionType: 'clipboard_read', direction: 'bidirectional', granted: true },
  { permissionType: 'clipboard_write', direction: 'bidirectional', granted: true },
  { permissionType: 'file_send', direction: 'bidirectional', granted: true },
  { permissionType: 'file_receive', direction: 'bidirectional', granted: true },
  { permissionType: 'file_access_read', direction: 'bidirectional', granted: false },
  { permissionType: 'file_access_write', direction: 'bidirectional', granted: false },
  { permissionType: 'notification_mirror', direction: 'bidirectional', granted: false },
] as const;
