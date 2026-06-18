/**
 * Local mode types — LAN-based direct device communication.
 *
 * When devices are on the same network, they connect directly via WebSocket
 * without going through the relay server. This provides:
 * - Lower latency
 * - Higher throughput (LAN speeds vs internet)
 * - Works offline (no internet needed)
 * - Same E2E encryption as remote mode
 */

/** Connection mode */
export type ConnectionMode = 'local' | 'remote' | 'disconnected';

/** Discovered device on local network */
export interface DiscoveredDevice {
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  ip: string;
  port: number;
  discoveredAt: number;
  /** Whether this device is already paired with us */
  isPaired: boolean;
}

/** Local server advertisement (broadcast via mDNS/UDP) */
export interface LocalAdvertisement {
  /** Protocol identifier */
  protocol: 'dropzone-local';
  /** Protocol version */
  version: number;
  /** Device code of advertiser */
  deviceCode: string;
  /** Device name */
  deviceName: string;
  /** Device type */
  deviceType: 'desktop' | 'mobile' | 'web';
  /** Local WebSocket port */
  port: number;
  /** Timestamp */
  ts: number;
}

/** Local connection state */
export interface LocalConnectionState {
  mode: ConnectionMode;
  /** Connected local peers (device codes) */
  localPeers: string[];
  /** Remote-only peers (device codes) */
  remotePeers: string[];
  /** Whether local server is running */
  isServerRunning: boolean;
  /** Local server port */
  serverPort: number | null;
  /** Discovery active */
  isDiscovering: boolean;
}

/** Local mode configuration */
export interface LocalModeConfig {
  /** Whether local mode is enabled */
  enabled: boolean;
  /** Port for local WebSocket server (0 = auto) */
  port: number;
  /** Discovery interval in ms (default: 3000) */
  discoveryIntervalMs: number;
  /** How long before a discovered device is considered stale (default: 10000) */
  staleTimeoutMs: number;
  /** Whether to prefer local connections when available */
  preferLocal: boolean;
}

/** Local mode event types */
export type LocalModeEventType =
  | 'device_discovered'
  | 'device_lost'
  | 'local_connected'
  | 'local_disconnected'
  | 'mode_changed'
  | 'server_started'
  | 'server_stopped';

/** Local mode event */
export interface LocalModeEvent {
  type: LocalModeEventType;
  deviceCode?: string;
  mode?: ConnectionMode;
  data?: any;
}

/** Network discovery adapter (platform-specific) */
export interface DiscoveryAdapter {
  /** Start advertising this device on local network */
  startAdvertising(advertisement: LocalAdvertisement): Promise<void>;
  /** Stop advertising */
  stopAdvertising(): Promise<void>;
  /** Start discovering other devices */
  startDiscovery(onDiscover: (device: DiscoveredDevice) => void): Promise<void>;
  /** Stop discovery */
  stopDiscovery(): Promise<void>;
  /** Get local IP address */
  getLocalIP(): Promise<string | null>;
}
