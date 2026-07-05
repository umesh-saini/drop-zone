import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { appTrayService } from './services/appTrayService.ts';
import { updaterService } from './services/updaterService.ts';
import { terminalService } from './services/terminalService.ts';

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
    icon: path.join(__dirname, '../build/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      webSecurity: true,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
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

  mainWindow.on('close', (e) => {
    if (!appTrayService.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  if (mainWindow) {
    appTrayService.init(mainWindow);
    updaterService.setWindow(mainWindow);
    terminalService.init(mainWindow);
  }
  
  updaterService.checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  terminalService.cleanup();
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

// Directory listing for remote file access hosting
ipcMain.handle('fs:listDirectory', (_event, dirPath: string, showHidden: boolean) => {
  try {
    const entries = fs.readdirSync(dirPath);
    return entries
      .filter((name) => showHidden || !name.startsWith('.'))
      .map((name) => {
        const fullPath = path.join(dirPath, name);
        try {
          const stats = fs.statSync(fullPath);
          return {
            name,
            path: fullPath,
            isDirectory: stats.isDirectory(),
            size: stats.isDirectory() ? 0 : stats.size,
            lastModified: stats.mtimeMs,
            mimeType: stats.isDirectory() ? undefined : getMimeType(path.extname(name)),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
});

ipcMain.handle('fs:getHomeDirs', () => {
  const home = app.getPath('home');
  return {
    home,
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
    pictures: app.getPath('pictures'),
    music: app.getPath('music'),
    videos: app.getPath('videos'),
  };
});

ipcMain.handle('fs:pathExists', (_event, filePath: string) => {
  return fs.existsSync(filePath);
});

// File operations for remote management
ipcMain.handle('fs:readFile', (_event, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('fs:readFileBase64', (_event, filePath: string) => {
  return fs.readFileSync(filePath, 'base64');
});

ipcMain.handle('fs:extractArchive', async (_event, filePath: string, destPath: string) => {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(filePath);
    zip.extractAllTo(destPath, true);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:writeFile', (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8');
});

ipcMain.handle('fs:copy', (_event, src: string, dest: string) => {
  fs.cpSync(src, dest, { recursive: true });
});

ipcMain.handle('fs:move', (_event, src: string, dest: string) => {
  fs.renameSync(src, dest);
});

ipcMain.handle('fs:delete', (_event, filePath: string) => {
  fs.rmSync(filePath, { recursive: true, force: true });
});

ipcMain.handle('fs:rename', (_event, src: string, dest: string) => {
  fs.renameSync(src, dest);
});

ipcMain.handle('fs:getProperties', (_event, filePath: string) => {
  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    created: stats.birthtimeMs,
    modified: stats.mtimeMs,
    isDirectory: stats.isDirectory(),
  };
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
