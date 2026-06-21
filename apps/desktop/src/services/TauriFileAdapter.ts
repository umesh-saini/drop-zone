import type { FileAdapter, FilePickerOptions, PickedFile } from '@dropzone/shared';

/**
 * Electron file adapter.
 *
 * Uses Electron's dialog + fs APIs via the preload bridge (window.electronAPI).
 * Falls back to HTML <input type=file> for browser dev mode.
 */
export class TauriFileAdapter implements FileAdapter {
  private browserFiles = new Map<string, File>();

  private get isElectron(): boolean {
    return !!window.electronAPI;
  }

  async pickFiles(options?: FilePickerOptions): Promise<PickedFile[]> {
    if (this.isElectron) {
      const files = await window.electronAPI!.openFileDialog({
        multiple: options?.multiple,
      });
      return files;
    }
    // Browser fallback
    return this.pickFilesBrowser(options);
  }

  private pickFilesBrowser(options?: FilePickerOptions): Promise<PickedFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options?.multiple ?? false;
      input.onchange = () => {
        const picked = Array.from(input.files || []).map((f) => {
          const p = `browser://${f.name}-${Date.now()}`;
          this.browserFiles.set(p, f);
          return {
            name: f.name,
            size: f.size,
            type: f.type || 'application/octet-stream',
            path: p,
            lastModified: f.lastModified,
          };
        });
        resolve(picked);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  async readChunk(filePath: string, offset: number, length: number): Promise<Uint8Array> {
    // Browser dev: in-memory File
    const browserFile = this.browserFiles.get(filePath);
    if (browserFile) {
      const buf = await browserFile.slice(offset, offset + length).arrayBuffer();
      return new Uint8Array(buf);
    }
    // Electron: IPC returns base64
    const base64 = await window.electronAPI!.readChunk(filePath, offset, length);
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  async getFileSize(filePath: string): Promise<number> {
    const browserFile = this.browserFiles.get(filePath);
    if (browserFile) return browserFile.size;
    return window.electronAPI!.getFileSize(filePath);
  }

  async writeChunk(filePath: string, offset: number, data: Uint8Array): Promise<void> {
    if (!this.isElectron) return; // browser can't write to disk
    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    const base64 = btoa(binary);
    await window.electronAPI!.writeChunk(filePath, offset, base64);
  }

  async createFile(filePath: string, _size: number): Promise<void> {
    if (!this.isElectron) return;
    // Just write empty to create it
    await window.electronAPI!.writeChunk(filePath, 0, '');
  }

  async getSaveDirectory(): Promise<string> {
    if (this.isElectron) {
      return window.electronAPI!.getDownloadsDir();
    }
    return '/tmp/dropzone';
  }

  async getReceivePath(fileName: string): Promise<string> {
    const dir = await this.getSaveDirectory();
    return `${dir}/${fileName}`;
  }

  async deleteFile(_filePath: string): Promise<void> {
    // Not implemented for now
  }

  async fileExists(_filePath: string): Promise<boolean> {
    return false;
  }
}
