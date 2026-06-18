/**
 * Message payload types for socket events
 */

// Clipboard message
export interface ClipboardMessage {
  deviceCode: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
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
