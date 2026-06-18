/**
 * File transfer types shared across all platforms
 */

/** Transfer direction */
export type TransferDirection = 'send' | 'receive';

/** Transfer status */
export type TransferStatus =
  | 'pending' // Offer sent, waiting for accept
  | 'accepted' // Accepted, ready to transfer
  | 'in_progress' // Actively transferring chunks
  | 'paused' // Paused by user
  | 'completed' // Transfer finished
  | 'failed' // Transfer failed
  | 'rejected' // Rejected by receiver
  | 'cancelled'; // Cancelled by sender

/** File metadata */
export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number; // bytes
  fileType: string; // MIME type
  lastModified?: number; // unix ms
}

/** File transfer offer (sent from sender to receiver) */
export interface FileOffer {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fromDevice: string;
  toDevice: string;
  timestamp: number;
  totalChunks: number;
  chunkSize: number;
}

/** File chunk for transfer */
export interface FileChunk {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string; // base64 encoded (encrypted)
  size: number; // actual bytes in this chunk
}

/** Transfer progress info */
export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  direction: TransferDirection;
  status: TransferStatus;
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
  chunksCompleted: number;
  totalChunks: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  startedAt: number;
  error?: string;
}

/** Transfer state for a single file */
export interface TransferState {
  fileId: string;
  metadata: FileMetadata;
  direction: TransferDirection;
  status: TransferStatus;
  pairingId: string;
  fromDevice: string;
  toDevice: string;
  chunkSize: number;
  totalChunks: number;
  completedChunks: Set<number>;
  startedAt: number;
  lastActivityAt: number;
  bytesTransferred: number;
  error?: string;
}

/** Platform file adapter */
export interface FileAdapter {
  /** Pick file(s) from device (opens file picker) */
  pickFiles(options?: FilePickerOptions): Promise<PickedFile[]>;
  /** Read a chunk of a file */
  readChunk(filePath: string, offset: number, length: number): Promise<Uint8Array>;
  /** Get file size */
  getFileSize(filePath: string): Promise<number>;
  /** Write chunk to destination file */
  writeChunk(filePath: string, offset: number, data: Uint8Array): Promise<void>;
  /** Create empty file with reserved space */
  createFile(filePath: string, size: number): Promise<void>;
  /** Get save directory for received files */
  getSaveDirectory(): Promise<string>;
  /** Generate path for a received file */
  getReceivePath(fileName: string): Promise<string>;
  /** Delete file */
  deleteFile(filePath: string): Promise<void>;
  /** Check if file exists */
  fileExists(filePath: string): Promise<boolean>;
}

/** File picker options */
export interface FilePickerOptions {
  multiple?: boolean;
  accept?: string[]; // MIME types or extensions
}

/** Picked file from file picker */
export interface PickedFile {
  name: string;
  size: number;
  type: string;
  path: string; // platform-specific path or URI
  lastModified?: number;
}

/** Transfer event callbacks */
export interface TransferEventHandlers {
  onProgress?: (progress: TransferProgress) => void;
  onCompleted?: (fileId: string, filePath: string) => void;
  onFailed?: (fileId: string, error: string) => void;
  onOffer?: (offer: FileOffer) => void;
}
