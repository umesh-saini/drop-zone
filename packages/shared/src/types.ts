// Device Types
export type DeviceType = "desktop" | "mobile" | "web";
export type Platform = "windows" | "mac" | "linux" | "android" | "ios" | "web";

export interface Device {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: DeviceType;
  platform: Platform;
  publicKey: string;
  createdAt: Date;
  lastSeen: Date;
}

// Pairing Types
export type PairingStatus = "active" | "revoked";

export interface Pairing {
  id: string;
  deviceACode: string;
  deviceBCode: string;
  status: PairingStatus;
  pairedAt: Date;
}

// Permission Types
export type PermissionType =
  | "clipboard_read"
  | "clipboard_write"
  | "file_send"
  | "file_receive"
  | "file_access_read"
  | "file_access_write"
  | "notification_mirror";

export type PermissionDirection = "a_to_b" | "b_to_a" | "bidirectional";

export interface Permission {
  id: string;
  pairingId: string;
  permissionType: PermissionType;
  direction: PermissionDirection;
  granted: boolean;
  grantedAt: Date;
  grantedBy: string;
}

// Session Types
export type ConnectionMode = "local" | "remote";

export interface Session {
  id: string;
  pairingId: string;
  deviceCode: string;
  socketId: string;
  connectedAt: Date;
  lastActive: Date;
  connectionMode: ConnectionMode;
}
