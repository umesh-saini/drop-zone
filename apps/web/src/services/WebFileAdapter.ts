import type { FileAdapter, FilePickerOptions, PickedFile } from '@dropzone/shared';

/**
 * Web browser file adapter.
 *
 * Uses File API and Blob API for file operations.
 * Files are stored in memory or IndexedDB (for larger files).
 */
export class WebFileAdapter implements FileAdapter {
  // In-memory store for received files (keyed by path)
  private fileStore = new Map<string, Uint8Array>();
  private sourceFiles = new Map<string, File>();

  async pickFiles(options?: FilePickerOptions): Promise<PickedFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options?.multiple ?? false;

      if (options?.accept) {
        input.accept = options.accept.join(',');
      }

      input.onchange = () => {
        const files = Array.from(input.files || []);
        const picked: PickedFile[] = files.map((file) => {
          const path = `memory://${file.name}-${Date.now()}`;
          this.sourceFiles.set(path, file);
          return {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            path,
            lastModified: file.lastModified,
          };
        });
        resolve(picked);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  async readChunk(filePath: string, offset: number, length: number): Promise<Uint8Array> {
    const file = this.sourceFiles.get(filePath);
    if (file) {
      const slice = file.slice(offset, offset + length);
      const buffer = await slice.arrayBuffer();
      return new Uint8Array(buffer);
    }

    // Check in-memory store
    const data = this.fileStore.get(filePath);
    if (data) {
      return data.slice(offset, offset + length);
    }

    throw new Error(`File not found: ${filePath}`);
  }

  async getFileSize(filePath: string): Promise<number> {
    const file = this.sourceFiles.get(filePath);
    if (file) return file.size;

    const data = this.fileStore.get(filePath);
    if (data) return data.length;

    return 0;
  }

  async writeChunk(filePath: string, offset: number, data: Uint8Array): Promise<void> {
    let existing = this.fileStore.get(filePath);
    if (!existing) {
      existing = new Uint8Array(offset + data.length);
    }

    if (existing.length < offset + data.length) {
      const resized = new Uint8Array(offset + data.length);
      resized.set(existing);
      existing = resized;
    }

    existing.set(data, offset);
    this.fileStore.set(filePath, existing);
  }

  async createFile(filePath: string, size: number): Promise<void> {
    this.fileStore.set(filePath, new Uint8Array(size));
  }

  async getSaveDirectory(): Promise<string> {
    return 'memory://downloads/';
  }

  async getReceivePath(fileName: string): Promise<string> {
    return `memory://downloads/${fileName}-${Date.now()}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    this.fileStore.delete(filePath);
    this.sourceFiles.delete(filePath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.fileStore.has(filePath) || this.sourceFiles.has(filePath);
  }

  /**
   * Trigger download of a received file in the browser.
   */
  downloadFile(filePath: string, fileName: string): void {
    const data = this.fileStore.get(filePath);
    if (!data) return;

    const blob = new Blob([data as BlobPart]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
