/**
 * Message payload types for socket events
 */

// Clipboard messages
export interface ClipboardSyncMessage {
  /** Encrypted content (base64 encoded ciphertext) — server relays as-is */
  content: string;
  /** Unix timestamp ms when clipboard was copied */
  timestamp: number;
}

export interface ClipboardUpdateMessage {
  /** Encrypted content (base64 encoded ciphertext) */
  content: string;
  /** Device code of sender */
  fromDevice: string;
  /** Unix timestamp ms */
  timestamp: number;
  /** Pairing ID — used by receiver to select correct decryption key */
  pairingId: string;
}

// File transfer messages
export interface FileOfferMessage {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fromDevice: string;
  toDevice: string;
  timestamp: number;
}

export interface FileChunkMessage {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string; // base64 encoded
  encrypted: boolean;
}

export interface FileCompleteMessage {
  fileId: string;
  success: boolean;
  error?: string;
}

// Pairing messages
export interface PairingRequestMessage {
  fromDevice: string;
  toDevice: string;
  publicKey: string;
  timestamp: number;
}

export interface PairingResponseMessage {
  accepted: boolean;
  pairingId?: string;
  publicKey?: string;
}

// Generic response
export interface ResponseMessage {
  success: boolean;
  message?: string;
  data?: any;
}
