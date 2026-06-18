import type { PairedDeviceInfo } from './types';

/**
 * Device management utilities for the UI.
 */

/**
 * Get device type icon name (for Lucide icons).
 */
export function getDeviceTypeIcon(deviceType: 'desktop' | 'mobile' | 'web'): string {
  switch (deviceType) {
    case 'desktop':
      return 'monitor';
    case 'mobile':
      return 'smartphone';
    case 'web':
      return 'globe';
  }
}

/**
 * Get platform icon name.
 */
export function getPlatformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'windows':
      return 'monitor';
    case 'mac':
      return 'apple';
    case 'linux':
      return 'terminal';
    case 'android':
      return 'smartphone';
    case 'ios':
      return 'smartphone';
    case 'web':
      return 'globe';
    default:
      return 'help-circle';
  }
}

/**
 * Get human-readable "last seen" text.
 */
export function getLastSeenText(lastSeen: number, isOnline: boolean): string {
  if (isOnline) return 'Online now';

  const diff = Date.now() - lastSeen;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(lastSeen).toLocaleDateString();
}

/**
 * Sort paired devices: online first, then by last seen.
 */
export function sortPairedDevices(devices: PairedDeviceInfo[]): PairedDeviceInfo[] {
  return [...devices].sort((a, b) => {
    // Online first
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    // Then by last seen (most recent first)
    return b.lastSeen - a.lastSeen;
  });
}

/**
 * Format device code for display (XXXX-XXXX).
 */
export function formatDeviceCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Get connection status color.
 */
export function getStatusColor(isOnline: boolean): string {
  return isOnline ? '#22c55e' : '#94a3b8'; // green-500 : slate-400
}
