import { app, BrowserWindow, ipcMain, clipboard, dialog, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    title: 'DropZone',
    icon: path.join(__dirname, '../public/favicon.svg'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove the menu bar completely
  mainWindow.setMenuBarVisibility(false);

  // Load from Vite dev server or built files
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:1420');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---

// Clipboard
ipcMain.handle('clipboard:read', () => {
  return clipboard.readText();
});

ipcMain.handle('clipboard:write', (_event, text: string) => {
  clipboard.writeText(text);
});

// File dialog
ipcMain.handle('dialog:openFile', async (_event, options?: { multiple?: boolean }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
  });
  if (result.canceled) return [];

  return result.filePaths.map((filePath) => {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      size: stats.size,
      type: getMimeType(path.extname(filePath)),
      path: filePath,
      lastModified: stats.mtimeMs,
    };
  });
});

// File read chunk
ipcMain.handle('fs:readChunk', (_event, filePath: string, offset: number, length: number) => {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(length);
  fs.readSync(fd, buffer, 0, length, offset);
  fs.closeSync(fd);
  // Return as base64 since we can't send Buffers directly via IPC easily
  return buffer.toString('base64');
});

// File size
ipcMain.handle('fs:getFileSize', (_event, filePath: string) => {
  const stats = fs.statSync(filePath);
  return stats.size;
});

// File write chunk (for receiving files)
ipcMain.handle('fs:writeChunk', (_event, filePath: string, offset: number, base64Data: string) => {
  const buffer = Buffer.from(base64Data, 'base64');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(filePath, offset === 0 ? 'w' : 'r+');
  fs.writeSync(fd, buffer, 0, buffer.length, offset);
  fs.closeSync(fd);
});

// Get downloads dir for receiving files
ipcMain.handle('fs:getDownloadsDir', () => {
  return app.getPath('downloads');
});

// Helper
function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}
