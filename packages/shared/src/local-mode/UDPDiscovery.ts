import type { DiscoveredDevice, DiscoveryAdapter, LocalAdvertisement } from './types';

/**
 * UDP broadcast-based discovery adapter.
 *
 * This is a reference/mock implementation. Platform-specific implementations:
 * - Desktop (Tauri): Use Rust-side UDP socket or tauri-plugin-network
 * - Mobile (Expo): Use react-native-udp or expo-network
 * - Web: Cannot do UDP — relies on server-assisted discovery
 *
 * Protocol:
 * - Broadcasts JSON advertisement to 255.255.255.255:41234 every N seconds
 * - Listens for other devices' advertisements on same port
 * - Auto-discovers paired devices on the same subnet
 */

/** Discovery port */
export const DISCOVERY_PORT = 41234;

/** Discovery broadcast address */
export const BROADCAST_ADDRESS = '255.255.255.255';

/**
 * Mock/reference UDP discovery adapter.
 * In production, each platform implements this with native UDP.
 */
export class MockDiscoveryAdapter implements DiscoveryAdapter {
  private advertising = false;
  private discovering = false;
  private advertisement: LocalAdvertisement | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  async startAdvertising(advertisement: LocalAdvertisement): Promise<void> {
    this.advertising = true;
    this.advertisement = advertisement;
    // In real implementation: send UDP broadcast periodically
    console.log(
      `[Discovery] Advertising: ${advertisement.deviceName} on port ${advertisement.port}`
    );
  }

  async stopAdvertising(): Promise<void> {
    this.advertising = false;
    this.advertisement = null;
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  async startDiscovery(onDiscover: (device: DiscoveredDevice) => void): Promise<void> {
    this.discovering = true;
    // In real implementation: listen on UDP port for incoming broadcasts
    console.log(`[Discovery] Listening on port ${DISCOVERY_PORT}`);
  }

  async stopDiscovery(): Promise<void> {
    this.discovering = false;
  }

  async getLocalIP(): Promise<string | null> {
    // In real implementation: use os.networkInterfaces() or platform API
    return '192.168.1.100';
  }

  /**
   * Simulate receiving a discovery broadcast (for testing).
   */
  simulateDiscovery(
    onDiscover: (device: DiscoveredDevice) => void,
    device: DiscoveredDevice
  ): void {
    onDiscover(device);
  }

  isAdvertising(): boolean {
    return this.advertising;
  }

  isDiscovering(): boolean {
    return this.discovering;
  }
}

/**
 * Encode advertisement for UDP broadcast.
 */
export function encodeAdvertisement(adv: LocalAdvertisement): string {
  return JSON.stringify(adv);
}

/**
 * Decode received UDP broadcast into advertisement.
 * Returns null if invalid.
 */
export function decodeAdvertisement(data: string): LocalAdvertisement | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.protocol !== 'dropzone-local') return null;
    if (parsed.version !== 1) return null;
    if (!parsed.deviceCode || !parsed.port) return null;
    return parsed as LocalAdvertisement;
  } catch {
    return null;
  }
}

/**
 * Convert a decoded advertisement to a DiscoveredDevice.
 */
export function advertisementToDevice(adv: LocalAdvertisement, ip: string): DiscoveredDevice {
  return {
    deviceCode: adv.deviceCode,
    deviceName: adv.deviceName,
    deviceType: adv.deviceType,
    ip,
    port: adv.port,
    discoveredAt: Date.now(),
    isPaired: false, // Caller updates this
  };
}
