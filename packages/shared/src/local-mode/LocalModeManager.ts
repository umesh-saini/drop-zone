import type {
  ConnectionMode,
  DiscoveredDevice,
  DiscoveryAdapter,
  LocalAdvertisement,
  LocalConnectionState,
  LocalModeConfig,
  LocalModeEvent,
} from './types';

/**
 * LocalModeManager handles the lifecycle of local (LAN) connections.
 *
 * Responsibilities:
 * - Run a local WebSocket server for direct connections
 * - Discover paired devices on the same network
 * - Manage connection mode per peer (local vs remote)
 * - Seamless fallback: prefer local, fall back to remote
 * - Emit events for UI (mode changes, discoveries)
 *
 * Platform-agnostic: uses DiscoveryAdapter for network-specific operations.
 */
export class LocalModeManager {
  private config: LocalModeConfig;
  private discoveryAdapter: DiscoveryAdapter;
  private discoveredDevices = new Map<string, DiscoveredDevice>();
  private localConnections = new Set<string>(); // device codes with active local connections
  private pairedDeviceCodes = new Set<string>(); // codes of devices we're paired with
  private eventListeners: ((event: LocalModeEvent) => void)[] = [];
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  // Device info
  private deviceCode: string;
  private deviceName: string;
  private deviceType: 'desktop' | 'mobile' | 'web';

  constructor(
    deviceCode: string,
    deviceName: string,
    deviceType: 'desktop' | 'mobile' | 'web',
    discoveryAdapter: DiscoveryAdapter,
    config: Partial<LocalModeConfig> = {}
  ) {
    this.deviceCode = deviceCode;
    this.deviceName = deviceName;
    this.deviceType = deviceType;
    this.discoveryAdapter = discoveryAdapter;
    this.config = {
      enabled: config.enabled ?? true,
      port: config.port ?? 0,
      discoveryIntervalMs: config.discoveryIntervalMs ?? 3000,
      staleTimeoutMs: config.staleTimeoutMs ?? 10000,
      preferLocal: config.preferLocal ?? true,
    };
  }

  /**
   * Start local mode: begin advertising and discovering.
   */
  async start(serverPort: number): Promise<void> {
    if (this.isRunning || !this.config.enabled) return;
    this.isRunning = true;

    // Advertise ourselves
    const advertisement: LocalAdvertisement = {
      protocol: 'dropzone-local',
      version: 1,
      deviceCode: this.deviceCode,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      port: serverPort,
      ts: Date.now(),
    };

    await this.discoveryAdapter.startAdvertising(advertisement);
    this.emit({ type: 'server_started' });

    // Start discovering
    await this.discoveryAdapter.startDiscovery((device) => {
      this.handleDiscovery(device);
    });

    // Start stale device cleanup
    this.staleCheckInterval = setInterval(() => {
      this.cleanupStaleDevices();
    }, this.config.staleTimeoutMs);
  }

  /**
   * Stop local mode: stop advertising and discovering.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    await this.discoveryAdapter.stopAdvertising();
    await this.discoveryAdapter.stopDiscovery();

    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }

    this.discoveredDevices.clear();
    this.localConnections.clear();
    this.emit({ type: 'server_stopped' });
  }

  /**
   * Handle a discovered device on the network.
   */
  private handleDiscovery(device: DiscoveredDevice): void {
    // Ignore ourselves
    if (device.deviceCode === this.deviceCode) return;

    // Mark as paired if we know them
    device.isPaired = this.pairedDeviceCodes.has(device.deviceCode);

    const existing = this.discoveredDevices.get(device.deviceCode);
    const isNew = !existing;

    // Update/add device
    device.discoveredAt = Date.now();
    this.discoveredDevices.set(device.deviceCode, device);

    if (isNew) {
      this.emit({ type: 'device_discovered', deviceCode: device.deviceCode, data: device });
    }
  }

  /**
   * Remove stale (no longer advertising) devices.
   */
  private cleanupStaleDevices(): void {
    const now = Date.now();
    for (const [code, device] of this.discoveredDevices) {
      if (now - device.discoveredAt > this.config.staleTimeoutMs) {
        this.discoveredDevices.delete(code);
        this.localConnections.delete(code);
        this.emit({ type: 'device_lost', deviceCode: code });
      }
    }
  }

  /**
   * Mark a device as locally connected.
   */
  markLocalConnected(deviceCode: string): void {
    this.localConnections.add(deviceCode);
    this.emit({ type: 'local_connected', deviceCode, mode: 'local' });
    this.emit({ type: 'mode_changed', deviceCode, mode: 'local' });
  }

  /**
   * Mark a device as locally disconnected.
   */
  markLocalDisconnected(deviceCode: string): void {
    this.localConnections.delete(deviceCode);
    this.emit({ type: 'local_disconnected', deviceCode, mode: 'remote' });
    this.emit({ type: 'mode_changed', deviceCode, mode: 'remote' });
  }

  /**
   * Update paired device codes (called when pairings change).
   */
  setPairedDevices(deviceCodes: string[]): void {
    this.pairedDeviceCodes = new Set(deviceCodes);
    // Update isPaired flag on discovered devices
    for (const [code, device] of this.discoveredDevices) {
      device.isPaired = this.pairedDeviceCodes.has(code);
    }
  }

  /**
   * Get the best connection mode for a device.
   * Returns 'local' if available and preferred, otherwise 'remote'.
   */
  getConnectionMode(deviceCode: string): ConnectionMode {
    if (this.localConnections.has(deviceCode) && this.config.preferLocal) {
      return 'local';
    }
    if (this.discoveredDevices.has(deviceCode) && this.config.preferLocal) {
      return 'local'; // Discovered but not yet connected — attempt local
    }
    return 'remote';
  }

  /**
   * Get connection info for a discovered device (IP + port for local WS connection).
   */
  getLocalConnectionInfo(deviceCode: string): { ip: string; port: number } | null {
    const device = this.discoveredDevices.get(deviceCode);
    if (!device) return null;
    return { ip: device.ip, port: device.port };
  }

  /**
   * Get all discovered devices.
   */
  getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get discovered paired devices (ready for local connection).
   */
  getDiscoveredPairedDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values()).filter((d) => d.isPaired);
  }

  /**
   * Get current state.
   */
  getState(): LocalConnectionState {
    return {
      mode: this.localConnections.size > 0 ? 'local' : 'remote',
      localPeers: Array.from(this.localConnections),
      remotePeers: Array.from(this.pairedDeviceCodes).filter(
        (code) => !this.localConnections.has(code)
      ),
      isServerRunning: this.isRunning,
      serverPort: this.config.port || null,
      isDiscovering: this.isRunning,
    };
  }

  /**
   * Subscribe to events.
   */
  onEvent(listener: (event: LocalModeEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<LocalModeConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Whether local mode is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  private emit(event: LocalModeEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
