/**
 * App configuration from environment variables.
 */
export const config = {
  serverUrl: import.meta.env.VITE_SERVER_URL || 'https://drop.devswitch.in',
  wsUrl: import.meta.env.VITE_WS_URL || 'https://drop.devswitch.in',
  localModeEnabled: import.meta.env.VITE_LOCAL_MODE_ENABLED === 'true',
  localDiscoveryPort: parseInt(import.meta.env.VITE_LOCAL_DISCOVERY_PORT || '41234', 10),
  deviceType: 'desktop' as const,
};

/**
 * Detect the desktop platform.
 */
export function detectPlatform(): 'windows' | 'mac' | 'linux' {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'mac';
  }
  return 'linux';
}
