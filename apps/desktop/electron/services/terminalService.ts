import * as pty from 'node-pty';
import { ipcMain, BrowserWindow } from 'electron';
import os from 'os';

export class TerminalService {
  private window: BrowserWindow | null = null;
  private sessions = new Map<string, pty.IPty>(); // pairingId -> pty

  public init(window: BrowserWindow) {
    this.window = window;
    
    // Register IPC listeners for PTY commands from the renderer (when acting as HOST)
    ipcMain.on('pty:start', (event, { pairingId, cols, rows }) => {
      this.startSession(pairingId, cols || 80, rows || 24);
    });

    ipcMain.on('pty:data', (event, { pairingId, data }) => {
      this.writeData(pairingId, data);
    });

    ipcMain.on('pty:resize', (event, { pairingId, cols, rows }) => {
      this.resizeSession(pairingId, cols, rows);
    });

    ipcMain.on('pty:close', (event, { pairingId }) => {
      this.closeSession(pairingId);
    });
  }

  private startSession(pairingId: string, cols: number, rows: number) {
    if (this.sessions.has(pairingId)) {
      this.closeSession(pairingId);
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols,
        rows,
        cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
        env: process.env as Record<string, string>,
      });

      ptyProcess.onData((data) => {
        // Send data back to renderer to be relayed to the client
        this.window?.webContents.send('pty:data-out', { pairingId, data });
      });

      ptyProcess.onExit(() => {
        this.closeSession(pairingId);
        this.window?.webContents.send('pty:close-out', { pairingId });
      });

      this.sessions.set(pairingId, ptyProcess);
    } catch (err) {
      console.error(`Failed to start PTY for pairing ${pairingId}:`, err);
    }
  }

  private writeData(pairingId: string, data: string) {
    const ptyProcess = this.sessions.get(pairingId);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  }

  private resizeSession(pairingId: string, cols: number, rows: number) {
    const ptyProcess = this.sessions.get(pairingId);
    if (ptyProcess) {
      try {
        ptyProcess.resize(cols, rows);
      } catch (err) {
        console.error(`Failed to resize PTY for pairing ${pairingId}:`, err);
      }
    }
  }

  private closeSession(pairingId: string) {
    const ptyProcess = this.sessions.get(pairingId);
    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (err) {
        console.error(`Failed to kill PTY for pairing ${pairingId}:`, err);
      }
      this.sessions.delete(pairingId);
    }
  }

  public cleanup() {
    for (const pairingId of this.sessions.keys()) {
      this.closeSession(pairingId);
    }
  }
}

export const terminalService = new TerminalService();
