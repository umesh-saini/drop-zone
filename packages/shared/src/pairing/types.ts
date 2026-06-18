/**
 * Pairing UX types — QR codes, PIN entry, device management
 */

/** Data encoded in QR code for pairing */
export interface QRPairingData {
  /** Protocol version */
  v: number;
  /** Device code (8-char) */
  code: string;
  /** Device public key (base64) */
  publicKey: string;
  /** Device name */
  name: string;
  /** Device type */
  type: 'desktop' | 'mobile' | 'web';
  /** Timestamp of QR generation (for expiry) */
  ts: number;
}

/** Pairing method */
export type PairingMethod = 'qr' | 'pin';

/** Pairing state machine */
export type PairingFlowState =
  | 'idle'
  | 'showing_code' // Displaying QR/PIN for other device to scan
  | 'scanning' // Scanning QR / entering PIN
  | 'requesting' // Sending pairing request to server
  | 'waiting_approval' // Waiting for other device to accept
  | 'confirming' // Showing confirmation dialog
  | 'key_exchange' // Performing key exchange
  | 'completed' // Successfully paired
  | 'failed'; // Pairing failed

/** Pairing flow event */
export interface PairingFlowEvent {
  state: PairingFlowState;
  error?: string;
  pairingId?: string;
  peerDevice?: PeerDeviceInfo;
}

/** Peer device info (displayed during pairing) */
export interface PeerDeviceInfo {
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform?: string;
  publicKey: string;
}

/** Paired device display info */
export interface PairedDeviceInfo {
  pairingId: string;
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform: string;
  isOnline: boolean;
  lastSeen: number; // unix ms
  pairedAt: number; // unix ms
}

/** Permission display info for UI */
export interface PermissionDisplayItem {
  permissionType: string;
  label: string;
  description: string;
  icon: string;
  direction: 'a_to_b' | 'b_to_a' | 'bidirectional';
  granted: boolean;
}
