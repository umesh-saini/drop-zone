import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Socket } from 'socket.io-client';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';

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
  chunks: Map<number, Uint8Array>;
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

    for (let i = 0; i < state.totalChunks; i++) {
      const position = i * CHUNK_SIZE;
      const length = Math.min(CHUNK_SIZE, state.fileSize - position);
      try {
        const base64 = await FileSystem.readAsStringAsync(state.filePath, {
          encoding: FileSystem.EncodingType.Base64,
          position,
          length,
        });
        this.socket?.emit('file:chunk', {
          fileId: state.fileId,
          toDevice: state.toDevice,
          chunkIndex: i,
          totalChunks: state.totalChunks,
          data: base64,
        });
        state.sent++;
        this.emitProgress({
          fileId: state.fileId,
          fileName: state.fileName,
          fileSize: state.fileSize,
          direction: 'send',
          status: 'in_progress',
          progress: Math.round((state.sent / state.totalChunks) * 100),
        });
        // Small yield to avoid flooding
        await new Promise((r) => setTimeout(r, 5));
      } catch {
        this.emitProgress({
          fileId: state.fileId,
          fileName: state.fileName,
          fileSize: state.fileSize,
          direction: 'send',
          status: 'failed',
          progress: 0,
        });
        return;
      }
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
    this.sends.delete(state.fileId);
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

    state.chunks.set(d.chunkIndex, decodeBase64(d.data));
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
      // Concatenate all chunk bytes in order
      let totalLen = 0;
      for (let i = 0; i < state.totalChunks; i++) {
        totalLen += state.chunks.get(i)?.length || 0;
      }
      const full = new Uint8Array(totalLen);
      let offset = 0;
      for (let i = 0; i < state.totalChunks; i++) {
        const c = state.chunks.get(i);
        if (c) {
          full.set(c, offset);
          offset += c.length;
        }
      }

      const dir = FileSystem.documentDirectory + 'dropzone/';
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const uri = dir + state.fileName;
      await FileSystem.writeAsStringAsync(uri, encodeBase64(full), {
        encoding: FileSystem.EncodingType.Base64,
      });

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
    } catch {
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
