import type { FileAdapter, FilePickerOptions, PickedFile } from '@dropzone/shared';

/**
 * Tauri-specific file adapter.
 *
 * Uses Tauri's file system APIs for native file operations.
 * Requires: @tauri-apps/plugin-dialog, @tauri-apps/plugin-fs
 */
export class TauriFileAdapter implements FileAdapter {
  private saveDir: string | null = null;

  private isTauri = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
  // In-memory file store for browser dev mode
  private browserFiles = new Map<string, File>();

  async pickFiles(options?: FilePickerOptions): Promise<PickedFile[]> {
    if (this.isTauri) {
      return this.pickFilesTauri(options);
    }
    return this.pickFilesBrowser(options);
  }

  private async pickFilesTauri(options?: FilePickerOptions): Promise<PickedFile[]> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        multiple: options?.multiple ?? false,
        filters: options?.accept ? [{ name: 'Files', extensions: options.accept }] : undefined,
      });

      if (!result) return [];

      const paths = Array.isArray(result) ? result : [result];
      const files: PickedFile[] = [];

      for (const path of paths) {
        const { stat } = await import('@tauri-apps/plugin-fs');
        const info = await stat(path);
        const name = path.split('/').pop() || path.split('\\').pop() || 'unknown';

        files.push({
          name,
          size: info.size,
          type: getMimeType(name),
          path,
          lastModified: info.mtime ? new Date(info.mtime).getTime() : undefined,
        });
      }

      return files;
    } catch (e) {
      console.error('[FileAdapter] Tauri pickFiles failed:', e);
      return [];
    }
  }

  private pickFilesBrowser(options?: FilePickerOptions): Promise<PickedFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options?.multiple ?? false;
      input.onchange = () => {
        const fileList = Array.from(input.files || []);
        const picked: PickedFile[] = fileList.map((f) => {
          const path = `browser://${f.name}-${Date.now()}`;
          this.browserFiles.set(path, f);
          return {
            name: f.name,
            size: f.size,
            type: f.type || 'application/octet-stream',
            path,
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
    // Browser dev mode: read from in-memory File object
    const browserFile = this.browserFiles.get(filePath);
    if (browserFile) {
      const slice = browserFile.slice(offset, offset + length);
      const buf = await slice.arrayBuffer();
      return new Uint8Array(buf);
    }
    // Tauri native
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const fullData = await readFile(filePath);
    return fullData.slice(offset, offset + length);
  }

  async getFileSize(filePath: string): Promise<number> {
    const browserFile = this.browserFiles.get(filePath);
    if (browserFile) return browserFile.size;
    const { stat } = await import('@tauri-apps/plugin-fs');
    const info = await stat(filePath);
    return info.size;
  }

  async writeChunk(filePath: string, offset: number, data: Uint8Array): Promise<void> {
    const { writeFile, readFile } = await import('@tauri-apps/plugin-fs');
    // Read existing file, splice in chunk, write back
    // For production: use a Rust command for seek-based writing
    let existing: Uint8Array;
    try {
      existing = await readFile(filePath);
    } catch {
      existing = new Uint8Array(offset + data.length);
    }

    const result = new Uint8Array(Math.max(existing.length, offset + data.length));
    result.set(existing);
    result.set(data, offset);
    await writeFile(filePath, result);
  }

  async createFile(filePath: string, size: number): Promise<void> {
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    // Create empty file (will be filled by writeChunk)
    await writeFile(filePath, new Uint8Array(0));
  }

  async getSaveDirectory(): Promise<string> {
    if (this.saveDir) return this.saveDir;
    try {
      const { downloadDir } = await import('@tauri-apps/api/path');
      this.saveDir = await downloadDir();
      return this.saveDir;
    } catch {
      return '/tmp/dropzone';
    }
  }

  async getReceivePath(fileName: string): Promise<string> {
    const dir = await this.getSaveDirectory();
    const separator = dir.includes('\\') ? '\\' : '/';
    return `${dir}${separator}${fileName}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const { remove } = await import('@tauri-apps/plugin-fs');
      await remove(filePath);
    } catch {
      // Silently ignore
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const { exists } = await import('@tauri-apps/plugin-fs');
      return await exists(filePath);
    } catch {
      return false;
    }
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    json: 'application/json',
    zip: 'application/zip',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
