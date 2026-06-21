import type {
  FileAdapter,
  FileOffer,
  FileChunk,
  TransferState,
  TransferProgress,
  TransferEventHandlers,
  TransferStatus,
  PickedFile,
} from './types';
import {
  calculateOptimalChunkSize,
  calculateTotalChunks,
  getChunkOffset,
  getChunkSize,
  generateFileId,
  validateChunk,
} from './chunker';

/**
 * TransferManager handles file sending and receiving.
 *
 * Platform-agnostic: uses FileAdapter for platform-specific file I/O.
 * Encryption is handled externally (via callbacks) — manager works with raw bytes.
 *
 * Features:
 * - Chunked file transfer with progress tracking
 * - Resume support (tracks completed chunks)
 * - Speed calculation and ETA
 * - Multiple concurrent transfers
 * - Automatic cleanup on failure
 */
export class TransferManager {
  private fileAdapter: FileAdapter;
  private transfers = new Map<string, TransferState>();
  private handlers: TransferEventHandlers;
  private sendChunkFn: ((chunk: FileChunk, toDevice: string) => void) | null = null;
  private sendOfferFn: ((offer: FileOffer) => void) | null = null;
  private sendCompleteFn: ((fileId: string, toDevice: string) => void) | null = null;

  constructor(fileAdapter: FileAdapter, handlers: TransferEventHandlers = {}) {
    this.fileAdapter = fileAdapter;
    this.handlers = handlers;
  }

  /**
   * Set socket send functions.
   */
  setSendFunctions(fns: {
    sendChunk: (chunk: FileChunk, toDevice: string) => void;
    sendOffer: (offer: FileOffer) => void;
    sendComplete: (fileId: string, toDevice: string) => void;
  }): void {
    this.sendChunkFn = fns.sendChunk;
    this.sendOfferFn = fns.sendOffer;
    this.sendCompleteFn = fns.sendComplete;
  }

  /**
   * Initiate sending a file to a device.
   * Returns the file offer that should be sent to the receiver.
   */
  async sendFile(
    file: PickedFile,
    toDevice: string,
    fromDevice: string,
    pairingId: string
  ): Promise<FileOffer> {
    const fileId = generateFileId();
    const chunkSize = calculateOptimalChunkSize(file.size);
    const totalChunks = calculateTotalChunks(file.size, chunkSize);

    const offer: FileOffer = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fromDevice,
      toDevice,
      timestamp: Date.now(),
      totalChunks,
      chunkSize,
    };

    // Track the transfer
    const state: TransferState = {
      fileId,
      metadata: {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified,
      },
      direction: 'send',
      status: 'pending',
      pairingId,
      fromDevice,
      toDevice,
      chunkSize,
      totalChunks,
      completedChunks: new Set(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      bytesTransferred: 0,
    };

    this.transfers.set(fileId, state);

    // Store the file path for later chunk reading
    (state as any)._filePath = file.path;

    // Send offer via socket
    if (this.sendOfferFn) {
      this.sendOfferFn(offer);
    }

    return offer;
  }

  /**
   * Handle an incoming file offer from another device.
   */
  handleOffer(offer: FileOffer, pairingId: string): void {
    const state: TransferState = {
      fileId: offer.fileId,
      metadata: {
        fileId: offer.fileId,
        fileName: offer.fileName,
        fileSize: offer.fileSize,
        fileType: offer.fileType,
      },
      direction: 'receive',
      status: 'pending',
      pairingId,
      fromDevice: offer.fromDevice,
      toDevice: offer.toDevice,
      chunkSize: offer.chunkSize,
      totalChunks: offer.totalChunks,
      completedChunks: new Set(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      bytesTransferred: 0,
    };

    this.transfers.set(offer.fileId, state);
    this.handlers.onOffer?.(offer);
  }

  /**
   * Accept a file transfer (receiver side).
   * Returns true if accepted successfully.
   */
  async acceptTransfer(fileId: string): Promise<boolean> {
    const state = this.transfers.get(fileId);
    if (!state || state.status !== 'pending' || state.direction !== 'receive') {
      return false;
    }

    state.status = 'accepted';
    state.lastActivityAt = Date.now();

    // Create the destination file
    try {
      const savePath = await this.fileAdapter.getReceivePath(state.metadata.fileName);
      (state as any)._savePath = savePath;
      await this.fileAdapter.createFile(savePath, state.metadata.fileSize);
    } catch (error: any) {
      state.status = 'failed';
      state.error = `Failed to create file: ${error.message}`;
      this.handlers.onFailed?.(fileId, state.error);
      return false;
    }

    return true;
  }

  /**
   * Reject a file transfer (receiver side).
   */
  rejectTransfer(fileId: string): void {
    const state = this.transfers.get(fileId);
    if (!state || state.direction !== 'receive') return;
    state.status = 'rejected';
  }

  /**
   * Start sending chunks after the receiver accepts.
   * Called when we receive 'file:accept' from the receiver.
   */
  async startSending(fileId: string): Promise<void> {
    const state = this.transfers.get(fileId);
    if (!state || state.direction !== 'send') return;

    state.status = 'in_progress';
    state.startedAt = Date.now();
    const filePath = (state as any)._filePath as string;

    for (let i = 0; i < state.totalChunks; i++) {
      // Check if transfer was cancelled/paused
      if (state.status !== 'in_progress') break;

      // Skip already completed chunks (resume support)
      if (state.completedChunks.has(i)) continue;

      const offset = getChunkOffset(i, state.chunkSize);
      const size = getChunkSize(i, state.totalChunks, state.metadata.fileSize, state.chunkSize);

      try {
        // Read chunk from file
        const data = await this.fileAdapter.readChunk(filePath, offset, size);

        // Convert to base64 for transport
        const base64 = uint8ArrayToBase64(data);

        const chunk: FileChunk = {
          fileId,
          chunkIndex: i,
          totalChunks: state.totalChunks,
          data: base64,
          size: data.length,
        };

        // Send chunk via socket
        if (this.sendChunkFn) {
          this.sendChunkFn(chunk, state.toDevice);
        }

        state.completedChunks.add(i);
        state.bytesTransferred += data.length;
        state.lastActivityAt = Date.now();

        // Emit progress
        this.emitProgress(state);

        // Small delay between chunks to avoid flooding
        await sleep(5);
      } catch (error: any) {
        state.status = 'failed';
        state.error = `Failed to read chunk ${i}: ${error.message}`;
        this.handlers.onFailed?.(fileId, state.error);
        return;
      }
    }

    // All chunks sent
    if (state.status === 'in_progress') {
      state.status = 'completed';
      if (this.sendCompleteFn) {
        this.sendCompleteFn(fileId, state.toDevice);
      }
      this.handlers.onCompleted?.(fileId, (state as any)._filePath);
    }
  }

  /**
   * Handle a received chunk (receiver side).
   */
  async handleChunk(chunk: FileChunk): Promise<void> {
    const state = this.transfers.get(chunk.fileId);
    if (!state || state.direction !== 'receive') return;

    if (state.status === 'accepted') {
      state.status = 'in_progress';
    }

    if (state.status !== 'in_progress') return;

    // Track synchronous receipt before async processing
    (state as any)._receivedChunksCount = ((state as any)._receivedChunksCount || 0) + 1;

    // Validate chunk
    const validation = validateChunk(
      chunk.chunkIndex,
      chunk.totalChunks,
      chunk.data.length,
      chunk.size
    );
    if (!validation.valid) {
      state.status = 'failed';
      state.error = validation.error;
      this.handlers.onFailed?.(chunk.fileId, state.error!);
      return;
    }

    // Skip duplicate chunks
    if (state.completedChunks.has(chunk.chunkIndex)) return;

    try {
      // Decode and write chunk
      const data = base64ToUint8Array(chunk.data);
      const offset = getChunkOffset(chunk.chunkIndex, state.chunkSize);
      const savePath = (state as any)._savePath as string;

      await this.fileAdapter.writeChunk(savePath, offset, data);

      state.completedChunks.add(chunk.chunkIndex);
      state.bytesTransferred += data.length;
      state.lastActivityAt = Date.now();

      this.emitProgress(state);

      // If this was the final chunk finishing its write, and the complete signal was already received, finalize.
      if (
        (state as any)._completeSignalReceived &&
        state.completedChunks.size === state.totalChunks
      ) {
        if ((state.status as string) !== 'completed') {
          state.status = 'completed';
          const finalSavePath = (state as any)._savePath as string;
          this.handlers.onCompleted?.(chunk.fileId, finalSavePath);
        }
      }
    } catch (error: any) {
      state.status = 'failed';
      state.error = `Failed to write chunk ${chunk.chunkIndex}: ${error.message}`;
      this.handlers.onFailed?.(chunk.fileId, state.error);
    }
  }

  /**
   * Handle transfer completion signal from sender.
   */
  handleComplete(fileId: string): void {
    const state = this.transfers.get(fileId);
    if (!state || state.direction !== 'receive') return;

    (state as any)._completeSignalReceived = true;

    // Check if network delivered all chunks
    const receivedCount = (state as any)._receivedChunksCount || 0;
    if (receivedCount < state.totalChunks) {
      // Genuinely missing chunks over the network
      state.status = 'failed';
      state.error = `Incomplete network delivery: ${receivedCount}/${state.totalChunks} chunks`;
      this.handlers.onFailed?.(fileId, state.error);
    } else if (state.completedChunks.size === state.totalChunks) {
      // All chunks written
      if (state.status !== 'completed') {
        state.status = 'completed';
        const savePath = (state as any)._savePath as string;
        this.handlers.onCompleted?.(fileId, savePath);
      }
    }
    // Otherwise, all chunks are received but some are still writing to disk.
    // They will trigger completion themselves when they finish.
  }

  /**
   * Cancel a transfer.
   */
  cancelTransfer(fileId: string): void {
    const state = this.transfers.get(fileId);
    if (!state) return;
    state.status = 'cancelled';
  }

  /**
   * Pause a transfer.
   */
  pauseTransfer(fileId: string): void {
    const state = this.transfers.get(fileId);
    if (!state || state.status !== 'in_progress') return;
    state.status = 'paused';
  }

  /**
   * Resume a paused transfer (sender side).
   */
  async resumeTransfer(fileId: string): Promise<void> {
    const state = this.transfers.get(fileId);
    if (!state || state.status !== 'paused' || state.direction !== 'send') return;
    state.status = 'in_progress';
    await this.startSending(fileId);
  }

  /**
   * Get progress for a transfer.
   */
  getProgress(fileId: string): TransferProgress | null {
    const state = this.transfers.get(fileId);
    if (!state) return null;
    return this.buildProgress(state);
  }

  /**
   * Get all active transfers.
   */
  getAllTransfers(): TransferProgress[] {
    return Array.from(this.transfers.values()).map((s) => this.buildProgress(s));
  }

  /**
   * Get transfers by status.
   */
  getTransfersByStatus(status: TransferStatus): TransferProgress[] {
    return Array.from(this.transfers.values())
      .filter((s) => s.status === status)
      .map((s) => this.buildProgress(s));
  }

  /**
   * Remove completed/failed/cancelled transfers from memory.
   */
  cleanup(): void {
    for (const [fileId, state] of this.transfers) {
      if (['completed', 'failed', 'cancelled', 'rejected'].includes(state.status)) {
        this.transfers.delete(fileId);
      }
    }
  }

  private emitProgress(state: TransferState): void {
    this.handlers.onProgress?.(this.buildProgress(state));
  }

  private buildProgress(state: TransferState): TransferProgress {
    const elapsed = (Date.now() - state.startedAt) / 1000; // seconds
    const speed = elapsed > 0 ? state.bytesTransferred / elapsed : 0;
    const remaining = state.metadata.fileSize - state.bytesTransferred;
    const eta = speed > 0 ? remaining / speed : 0;

    return {
      fileId: state.fileId,
      fileName: state.metadata.fileName,
      fileSize: state.metadata.fileSize,
      direction: state.direction,
      status: state.status,
      bytesTransferred: state.bytesTransferred,
      totalBytes: state.metadata.fileSize,
      progress:
        state.metadata.fileSize > 0
          ? Math.round((state.bytesTransferred / state.metadata.fileSize) * 100)
          : 0,
      chunksCompleted: state.completedChunks.size,
      totalChunks: state.totalChunks,
      speed,
      estimatedTimeRemaining: eta,
      startedAt: state.startedAt,
      error: state.error,
    };
  }
}

// --- Helpers ---

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
