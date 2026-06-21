/**
 * Type declarations for the Electron preload bridge.
 */
interface ElectronAPI {
  clipboardRead(): Promise<string>;
  clipboardWrite(text: string): Promise<void>;
  openFileDialog(options?: {
    multiple?: boolean;
  }): Promise<{ name: string; size: number; type: string; path: string; lastModified: number }[]>;
  readChunk(filePath: string, offset: number, length: number): Promise<string>;
  getFileSize(filePath: string): Promise<number>;
  writeChunk(filePath: string, offset: number, base64Data: string): Promise<void>;
  getDownloadsDir(): Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
