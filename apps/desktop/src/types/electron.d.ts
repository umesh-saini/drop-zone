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
  listDirectory(
    dirPath: string,
    showHidden: boolean
  ): Promise<
    {
      name: string;
      path: string;
      isDirectory: boolean;
      size: number;
      lastModified: number;
      mimeType?: string;
    }[]
  >;
  getHomeDirs(): Promise<{
    home: string;
    documents: string;
    downloads: string;
    desktop: string;
    pictures: string;
    music: string;
    videos: string;
  }>;
  pathExists(filePath: string): Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
