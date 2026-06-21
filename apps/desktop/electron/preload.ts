import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose a safe subset of Electron APIs to the renderer via contextBridge.
 * The renderer accesses these via `window.electronAPI`.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard
  clipboardRead: (): Promise<string> => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text),

  // File dialog
  openFileDialog: (options?: {
    multiple?: boolean;
  }): Promise<{ name: string; size: number; type: string; path: string; lastModified: number }[]> =>
    ipcRenderer.invoke('dialog:openFile', options),

  // File system
  readChunk: (filePath: string, offset: number, length: number): Promise<string> =>
    ipcRenderer.invoke('fs:readChunk', filePath, offset, length),
  getFileSize: (filePath: string): Promise<number> =>
    ipcRenderer.invoke('fs:getFileSize', filePath),
  writeChunk: (filePath: string, offset: number, base64Data: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeChunk', filePath, offset, base64Data),
  getDownloadsDir: (): Promise<string> => ipcRenderer.invoke('fs:getDownloadsDir'),
});
