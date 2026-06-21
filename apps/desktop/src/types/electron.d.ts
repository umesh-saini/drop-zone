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
  readFile(filePath: string): Promise<string>;
  readFileBase64(filePath: string): Promise<string>;
  extractArchive(filePath: string, destPath: string): Promise<{ success: boolean; error?: string }>;
  writeFile(filePath: string, content: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  moveFile(src: string, dest: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  renameFile(src: string, dest: string): Promise<void>;
  getProperties(filePath: string): Promise<{ size: number; created: number; modified: number; isDirectory: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
