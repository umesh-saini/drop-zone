const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a safe subset of Electron APIs to the renderer via contextBridge.
 * The renderer accesses these via `window.electronAPI`.
 *
 * Note: This file MUST use CommonJS (require) — Electron preload scripts
 * don't support ES modules.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (text: string) => ipcRenderer.invoke('clipboard:write', text),

  // File dialog
  openFileDialog: (options?: { multiple?: boolean }) =>
    ipcRenderer.invoke('dialog:openFile', options),

  // File system
  readChunk: (filePath: string, offset: number, length: number) =>
    ipcRenderer.invoke('fs:readChunk', filePath, offset, length),
  getFileSize: (filePath: string) => ipcRenderer.invoke('fs:getFileSize', filePath),
  writeChunk: (filePath: string, offset: number, base64Data: string) =>
    ipcRenderer.invoke('fs:writeChunk', filePath, offset, base64Data),
  getDownloadsDir: () => ipcRenderer.invoke('fs:getDownloadsDir'),
});
