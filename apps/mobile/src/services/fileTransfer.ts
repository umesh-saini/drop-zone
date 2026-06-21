import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Socket } from 'socket.io-client';

/**
 * Mobile file transfer — self-contained, wire-compatible with the desktop
 * TransferManager (sender-provided fileId, base64 chunks).
 *
 * Note: chunks are currently sent unencrypted (matches desktop wiring).
 * Receiver accumulates chunk bytes in memory and writes the file on complete.
 */

const CHUNK_SIZE = 64 * 1024; // 64KB

export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  direction: 'send' | 'receive';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  fromDevice?: string;
}

interface SendState {
  fileId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  toDevice: string;
  sent: number;
}

interface RecvState {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  fromDevice: string;
  chunks: Map<number, string>; // base64 strings
  received: number;
}

export class FileTransfer {
  private socket: Socket | null = null;
  private deviceCode = '';
  private sends = new Map<string, SendState>();
  private recvs = new Map<string, RecvState>();

  onProgress?: (p: TransferProgress) => void;
  onIncomingOffer?: (offer: {
    fileId: string;
    fileName: string;
    fileSize: number;
    fromDevice: string;
  }) => void;
  onSaved?: (fileName: string, uri: string) => void;

  attach(socket: Socket, deviceCode: string) {
    this.socket = socket;
    this.deviceCode = deviceCode;

    socket.on('file:offer', (d: any) => this.handleOffer(d));
    socket.on('file:accept', (d: any) => this.handleAccept(d));
    socket.on('file:reject', (d: any) => this.handleReject(d));
    socket.on('file:chunk', (d: any) => this.handleChunk(d));
    socket.on('file:complete', (d: any) => this.handleComplete(d));
  }

  /**
   * Pick a file and send it to a device.
   */
  async pickAndSend(toDevice: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }

    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    } catch (e: any) {
      throw new Error('File picker failed: ' + (e.message || String(e)));
    }
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const size = asset.size || 0;
    const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));

    const state: SendState = {
      fileId,
      filePath: asset.uri,
      fileName: asset.name,
      fileSize: size,
      fileType: asset.mimeType || 'application/octet-stream',
      totalChunks,
      toDevice,
      sent: 0,
    };
    this.sends.set(fileId, state);

    this.emitProgress({
      fileId,
      fileName: state.fileName,
      fileSize: size,
      direction: 'send',
      status: 'pending',
      progress: 0,
    });

    this.socket?.emit('file:offer', {
      fileId,
      toDevice,
      fileName: state.fileName,
      fileSize: size,
      fileType: state.fileType,
      totalChunks,
      chunkSize: CHUNK_SIZE,
    });
  }

  private async handleAccept(d: { fileId: string }): Promise<void> {
    const state = this.sends.get(d.fileId);
    if (!state) return;

    this.emitProgress({
      fileId: state.fileId,
      fileName: state.fileName,
      fileSize: state.fileSize,
      direction: 'send',
      status: 'in_progress',
      progress: 0,
    });

    try {
      // Read entire file as base64 (expo-file-system doesn't support position/length)
      const fullBase64 = await FileSystem.readAsStringAsync(state.filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Split into chunks and send
      const chunkSizeB64 = Math.ceil((CHUNK_SIZE * 4) / 3); // base64 chars per chunk
      const totalChunks = Math.max(1, Math.ceil(fullBase64.length / chunkSizeB64));

      for (let i = 0; i < totalChunks; i++) {
        const chunkData = fullBase64.slice(i * chunkSizeB64, (i + 1) * chunkSizeB64);

        this.socket?.emit('file:chunk', {
          fileId: state.fileId,
          toDevice: state.toDevice,
          chunkIndex: i,
          totalChunks,
          data: chunkData,
        });

        state.sent++;
        this.emitProgress({
          fileId: state.fileId,
          fileName: state.fileName,
          fileSize: state.fileSize,
          direction: 'send',
          status: 'in_progress',
          progress: Math.round((state.sent / totalChunks) * 100),
        });

        // Yield to avoid blocking
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 10));
      }

      this.socket?.emit('file:complete', { fileId: state.fileId, toDevice: state.toDevice });
      this.emitProgress({
        fileId: state.fileId,
        fileName: state.fileName,
        fileSize: state.fileSize,
        direction: 'send',
        status: 'completed',
        progress: 100,
      });
    } catch (err: any) {
      console.error('[FileTransfer] Send failed:', err);
      this.emitProgress({
        fileId: state.fileId,
        fileName: state.fileName,
        fileSize: state.fileSize,
        direction: 'send',
        status: 'failed',
        progress: 0,
      });
    } finally {
      this.sends.delete(state.fileId);
    }
  }

  private handleReject(d: { fileId: string }): void {
    const state = this.sends.get(d.fileId);
    if (!state) return;
    this.emitProgress({
      fileId: state.fileId,
      fileName: state.fileName,
      fileSize: state.fileSize,
      direction: 'send',
      status: 'failed',
      progress: 0,
    });
    this.sends.delete(d.fileId);
  }

  private handleOffer(d: {
    fileId: string;
    fileName: string;
    fileSize: number;
    totalChunks: number;
    fromDevice: string;
  }): void {
    this.recvs.set(d.fileId, {
      fileId: d.fileId,
      fileName: d.fileName,
      fileSize: d.fileSize,
      totalChunks: d.totalChunks,
      fromDevice: d.fromDevice,
      chunks: new Map(),
      received: 0,
    });

    this.emitProgress({
      fileId: d.fileId,
      fileName: d.fileName,
      fileSize: d.fileSize,
      direction: 'receive',
      status: 'in_progress',
      progress: 0,
      fromDevice: d.fromDevice,
    });

    // Auto-accept (UI could prompt instead)
    this.socket?.emit('file:accept', { fileId: d.fileId, fromDevice: d.fromDevice });
    this.onIncomingOffer?.({
      fileId: d.fileId,
      fileName: d.fileName,
      fileSize: d.fileSize,
      fromDevice: d.fromDevice,
    });
  }

  private handleChunk(d: {
    fileId: string;
    chunkIndex: number;
    totalChunks: number;
    data: string;
  }): void {
    const state = this.recvs.get(d.fileId);
    if (!state) return;
    if (state.chunks.has(d.chunkIndex)) return;

    // Store raw base64 chunk (not decoded — we'll concat and write as base64)
    state.chunks.set(d.chunkIndex, d.data);
    state.received++;

    this.emitProgress({
      fileId: state.fileId,
      fileName: state.fileName,
      fileSize: state.fileSize,
      direction: 'receive',
      status: 'in_progress',
      progress: Math.round((state.received / state.totalChunks) * 100),
      fromDevice: state.fromDevice,
    });
  }

  private async handleComplete(d: { fileId: string }): Promise<void> {
    const state = this.recvs.get(d.fileId);
    if (!state) return;

    try {
      // Concatenate all base64 chunks in order
      let fullBase64 = '';
      for (let i = 0; i < state.totalChunks; i++) {
        const chunk = state.chunks.get(i);
        if (chunk) fullBase64 += chunk;
      }

      const dir = FileSystem.documentDirectory + 'dropzone/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const uri = dir + state.fileName;
      await FileSystem.writeAsStringAsync(uri, fullBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[FileTransfer] Saved to:', uri);

      this.emitProgress({
        fileId: state.fileId,
        fileName: state.fileName,
        fileSize: state.fileSize,
        direction: 'receive',
        status: 'completed',
        progress: 100,
        fromDevice: state.fromDevice,
      });
      this.onSaved?.(state.fileName, uri);
    } catch (err: any) {
      console.error('[FileTransfer] Save failed:', err);
      this.emitProgress({
        fileId: state.fileId,
        fileName: state.fileName,
        fileSize: state.fileSize,
        direction: 'receive',
        status: 'failed',
        progress: 0,
        fromDevice: state.fromDevice,
      });
    } finally {
      this.recvs.delete(d.fileId);
    }
  }

  private emitProgress(p: TransferProgress): void {
    this.onProgress?.(p);
  }
}
