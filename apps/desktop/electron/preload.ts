import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose a safe subset of Electron APIs to the renderer via contextBridge.
 * The renderer accesses these via `window.electronAPI`.
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

  // Directory listing (for remote file hosting)
  listDirectory: (dirPath: string, showHidden: boolean) =>
    ipcRenderer.invoke('fs:listDirectory', dirPath, showHidden),
  getHomeDirs: () => ipcRenderer.invoke('fs:getHomeDirs'),
  pathExists: (filePath: string) => ipcRenderer.invoke('fs:pathExists', filePath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  readFileBase64: (filePath: string) => ipcRenderer.invoke('fs:readFileBase64', filePath),
  extractArchive: (filePath: string, destPath: string) => ipcRenderer.invoke('fs:extractArchive', filePath, destPath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copy', src, dest),
  moveFile: (src: string, dest: string) => ipcRenderer.invoke('fs:move', src, dest),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete', filePath),
  renameFile: (src: string, dest: string) => ipcRenderer.invoke('fs:rename', src, dest),
  getProperties: (filePath: string) => ipcRenderer.invoke('fs:getProperties', filePath),

  // Tray menu syncing
  updateTrayPermissions: (pairings: any[]) => ipcRenderer.send('tray:update-permissions', pairings),
  onTogglePermission: (callback: (data: { pairingId: string; types: string[]; granted: boolean }) => void) => {
    ipcRenderer.removeAllListeners('app:toggle-permission');
    ipcRenderer.on('app:toggle-permission', (_event, data) => callback(data));
  },

  // Terminal (node-pty) HOST
  startPty: (pairingId: string, cols: number, rows: number) => ipcRenderer.send('pty:start', { pairingId, cols, rows }),
  writePty: (pairingId: string, data: string) => ipcRenderer.send('pty:data', { pairingId, data }),
  resizePty: (pairingId: string, cols: number, rows: number) => ipcRenderer.send('pty:resize', { pairingId, cols, rows }),
  closePty: (pairingId: string) => ipcRenderer.send('pty:close', { pairingId }),
  onPtyDataOut: (callback: (data: { pairingId: string; data: string }) => void) => {
    ipcRenderer.on('pty:data-out', (_event, data) => callback(data));
  },
  onPtyCloseOut: (callback: (data: { pairingId: string }) => void) => {
    ipcRenderer.on('pty:close-out', (_event, data) => callback(data));
  },
});
