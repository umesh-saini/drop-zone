import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
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
  fileType: string;
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
      result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
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
      // Copy to a temporary file we control to avoid content:// read limits
      const tempUri = FileSystem.documentDirectory + `temp-${state.fileId}`;
      let targetUri = state.filePath;
      let usedTemp = false;

      try {
        await FileSystem.copyAsync({ from: state.filePath, to: tempUri });
        targetUri = tempUri;
        usedTemp = true;
      } catch (e) {
        console.warn('[FileTransfer] copyAsync failed, reading directly from original path', e);
      }

      const totalChunks = state.totalChunks;

      for (let i = 0; i < totalChunks; i++) {
        const position = i * CHUNK_SIZE;
        const length = Math.min(CHUNK_SIZE, state.fileSize - position);

        // Read just this chunk natively
        const chunkData = await FileSystem.readAsStringAsync(targetUri, {
          encoding: FileSystem.EncodingType.Base64,
          position,
          length,
        });

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

      // Cleanup temp file if we used it
      if (usedTemp) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
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
    fileType?: string;
    totalChunks: number;
    fromDevice: string;
  }): void {
    this.recvs.set(d.fileId, {
      fileId: d.fileId,
      fileName: d.fileName,
      fileSize: d.fileSize,
      fileType: d.fileType || 'application/octet-stream',
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

    // Store raw base64 chunk as-is (each chunk is independently valid base64)
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
      // Each chunk is independently valid base64 (from btoa on the sender).
      // We decode each to binary, concatenate, then write as one base64 string.
      const binaryChunks: Uint8Array[] = [];
      let totalLen = 0;
      for (let i = 0; i < state.totalChunks; i++) {
        const b64 = state.chunks.get(i);
        if (!b64) continue;
        // Decode base64 to binary
        const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        binaryChunks.push(raw);
        totalLen += raw.length;
      }

      // Concatenate all binary
      const full = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of binaryChunks) {
        full.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert final binary to base64 for writing
      let binary = '';
      for (let i = 0; i < full.length; i++) {
        binary += String.fromCharCode(full[i]);
      }
      const finalBase64 = btoa(binary);

      let finalUri = '';

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await SecureStore.getItemAsync('savedDirectoryUri');
          let granted = !!directoryUri;

          if (!granted) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              directoryUri = permissions.directoryUri;
              await SecureStore.setItemAsync('savedDirectoryUri', directoryUri);
              granted = true;
            }
          }

          if (granted && directoryUri) {
            finalUri = await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              state.fileName,
              state.fileType
            );
            await FileSystem.writeAsStringAsync(finalUri, finalBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        } catch (e) {
          console.error('[FileTransfer] SAF failed, falling back:', e);
          // If it failed (e.g. user revoked permission or directory deleted), clear it for next time
          try { await SecureStore.deleteItemAsync('savedDirectoryUri'); } catch (_) {}
        }
      }

      if (!finalUri) {
        const dir = FileSystem.documentDirectory + 'dropzone/';
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        finalUri = dir + state.fileName;
        await FileSystem.writeAsStringAsync(finalUri, finalBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(finalUri, { dialogTitle: 'Save received file' });
        }
      }

      console.log('[FileTransfer] Saved to:', finalUri);

      this.emitProgress({
        fileId: state.fileId,
        fileName: state.fileName,
        fileSize: state.fileSize,
        direction: 'receive',
        status: 'completed',
        progress: 100,
        fromDevice: state.fromDevice,
      });
      this.onSaved?.(state.fileName, finalUri);
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
