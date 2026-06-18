import type { FileAdapter, FilePickerOptions, PickedFile } from '@dropzone/shared';

/**
 * Expo/React Native file adapter.
 *
 * Uses expo-document-picker for file selection and expo-file-system for I/O.
 * Requires: expo-document-picker, expo-file-system
 */
export class ExpoFileAdapter implements FileAdapter {
  private saveDir: string | null = null;

  async pickFiles(options?: FilePickerOptions): Promise<PickedFile[]> {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        multiple: options?.multiple ?? false,
        type: options?.accept || ['*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) return [];

      return result.assets.map((asset: any) => ({
        name: asset.name,
        size: asset.size || 0,
        type: asset.mimeType || 'application/octet-stream',
        path: asset.uri,
        lastModified: undefined,
      }));
    } catch {
      return [];
    }
  }

  async readChunk(filePath: string, offset: number, length: number): Promise<Uint8Array> {
    const FileSystem = await import('expo-file-system/legacy');
    // expo-file-system readAsStringAsync supports position/length
    const base64Data = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length,
    });
    return base64ToUint8Array(base64Data);
  }

  async getFileSize(filePath: string): Promise<number> {
    const FileSystem = await import('expo-file-system/legacy');
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists && 'size' in info) {
      return info.size || 0;
    }
    return 0;
  }

  async writeChunk(filePath: string, offset: number, data: Uint8Array): Promise<void> {
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = uint8ArrayToBase64(data);

    if (offset === 0) {
      // First chunk — write new file
      await FileSystem.writeAsStringAsync(filePath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      // Subsequent chunks — read existing, append, write back
      // For production: use a native module for seek-based writing
      const existing = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const existingBytes = base64ToUint8Array(existing);
      const result = new Uint8Array(Math.max(existingBytes.length, offset + data.length));
      result.set(existingBytes);
      result.set(data, offset);
      await FileSystem.writeAsStringAsync(filePath, uint8ArrayToBase64(result), {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  }

  async createFile(filePath: string, _size: number): Promise<void> {
    const FileSystem = await import('expo-file-system/legacy');
    await FileSystem.writeAsStringAsync(filePath, '', {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  async getSaveDirectory(): Promise<string> {
    if (this.saveDir) return this.saveDir;
    const FileSystem = await import('expo-file-system/legacy');
    this.saveDir = FileSystem.documentDirectory + 'dropzone/';

    // Ensure directory exists
    const info = await FileSystem.getInfoAsync(this.saveDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.saveDir, { intermediates: true });
    }

    return this.saveDir;
  }

  async getReceivePath(fileName: string): Promise<string> {
    const dir = await this.getSaveDirectory();
    return `${dir}${fileName}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const FileSystem = await import('expo-file-system/legacy');
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch {
      // Silently ignore
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const info = await FileSystem.getInfoAsync(filePath);
      return info.exists;
    } catch {
      return false;
    }
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
