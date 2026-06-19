/**
 * Client SDK types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RegisterResponse {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  token: string;
  secretToken: string;
}

export interface LoginResponse {
  deviceCode: string;
  deviceName: string;
  token: string;
}

export interface DeviceInfo {
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform: string;
  publicKey?: string;
  createdAt?: string;
  lastSeen?: string;
}

export interface PairingInfo {
  pairingId: string;
  deviceACode: string;
  deviceBCode: string;
  initiatedBy: string;
  status: 'pending' | 'active' | 'revoked';
  pairedAt?: string;
}

export interface PermissionInfo {
  id: string;
  permissionType: string;
  ownerDevice: string;
  granted: boolean;
  grantedAt: string;
}

/** Stored credentials for a registered device */
export interface DeviceCredentials {
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform: string;
  token: string;
  secretToken: string;
  publicKey: string;
  secretKey: string;
}

/**
 * Minimal socket interface that socket.io-client satisfies.
 * Lets the shared package stay decoupled from a specific socket.io version.
 */
export interface SocketLike {
  connected: boolean;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener?: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  connect(): void;
  disconnect(): void;
}
