import type {
  DirectoryListing,
  FilePreview,
  RemoteAccessRequest,
  RemoteAccessResponse,
  RemoteFileEntry,
  RemoteFileSystemAdapter,
  SandboxConfig,
  SandboxRoot,
} from './types';

/**
 * RemoteAccessHost runs on the SOURCE device (the one sharing its files).
 *
 * It handles incoming requests from paired devices to browse directories,
 * preview files, and download files — all within the sandboxed paths.
 *
 * Security:
 * - All paths are validated against the sandbox config
 * - Path traversal attacks (../) are blocked
 * - Only configured directories are accessible
 * - Max file size limits enforced
 */
export class RemoteAccessHost {
  private fsAdapter: RemoteFileSystemAdapter;
  private config: SandboxConfig;

  constructor(fsAdapter: RemoteFileSystemAdapter, config: SandboxConfig) {
    this.fsAdapter = fsAdapter;
    this.config = config;
  }

  /**
   * Handle an incoming remote access request.
   */
  async handleRequest(request: RemoteAccessRequest): Promise<RemoteAccessResponse> {
    try {
      switch (request.type) {
        case 'get_sandbox_roots':
          return this.handleGetSandboxRoots(request);
        case 'list_directory':
          return this.handleListDirectory(request);
        case 'get_preview':
          return this.handleGetPreview(request);
        case 'download_file':
          return this.handleDownloadFile(request);
        default:
          return { requestId: request.requestId, success: false, error: 'Unknown request type' };
      }
    } catch (error: any) {
      return { requestId: request.requestId, success: false, error: error.message };
    }
  }

  /**
   * Get sandbox root directories available for browsing.
   */
  private async handleGetSandboxRoots(request: RemoteAccessRequest): Promise<RemoteAccessResponse> {
    const roots: SandboxRoot[] = this.config.allowedPaths.map((path, index) => ({
      index,
      label: this.config.labels[path] || path.split('/').pop() || path,
      path: this.config.labels[path] || path.split('/').pop() || path,
    }));

    return { requestId: request.requestId, success: true, data: roots };
  }

  /**
   * List directory contents within the sandbox.
   */
  private async handleListDirectory(request: RemoteAccessRequest): Promise<RemoteAccessResponse> {
    const absolutePath = this.resolvePath(request.rootIndex ?? 0, request.path || '');
    if (!absolutePath) {
      return {
        requestId: request.requestId,
        success: false,
        error: 'Access denied: path outside sandbox',
      };
    }

    const isDir = await this.fsAdapter.isDirectory(absolutePath);
    if (!isDir) {
      return { requestId: request.requestId, success: false, error: 'Not a directory' };
    }

    const entries = await this.fsAdapter.listDirectory(absolutePath, this.config.showHidden);

    // Calculate relative paths for entries
    const rootPath = this.config.allowedPaths[request.rootIndex ?? 0];
    const relativePath = request.path || '';
    const entriesWithRelative: RemoteFileEntry[] = entries.map((entry) => ({
      ...entry,
      path: relativePath ? `${relativePath}/${entry.name}` : entry.name,
    }));

    // Sort: directories first, then alphabetical
    entriesWithRelative.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    const listing: DirectoryListing = {
      path: relativePath || '/',
      entries: entriesWithRelative,
      parentPath: relativePath ? relativePath.split('/').slice(0, -1).join('/') || null : null,
    };

    return { requestId: request.requestId, success: true, data: listing };
  }

  /**
   * Get a file preview (thumbnail or first N bytes of text).
   */
  private async handleGetPreview(request: RemoteAccessRequest): Promise<RemoteAccessResponse> {
    const absolutePath = this.resolvePath(request.rootIndex ?? 0, request.path || '');
    if (!absolutePath) {
      return {
        requestId: request.requestId,
        success: false,
        error: 'Access denied: path outside sandbox',
      };
    }

    const info = await this.fsAdapter.getFileInfo(absolutePath);
    if (!info || info.isDirectory) {
      return { requestId: request.requestId, success: false, error: 'File not found' };
    }

    if (info.size > this.config.maxPreviewSize) {
      return { requestId: request.requestId, success: false, error: 'File too large for preview' };
    }

    const maxPreviewBytes = Math.min(info.size, 10 * 1024); // 10KB max preview
    const data = await this.fsAdapter.readPreview(absolutePath, maxPreviewBytes);

    const preview: FilePreview = {
      path: request.path || '',
      fileName: info.name,
      mimeType: info.mimeType || 'application/octet-stream',
      size: info.size,
      data: uint8ArrayToBase64(data),
      isPartial: data.length < info.size,
    };

    return { requestId: request.requestId, success: true, data: preview };
  }

  /**
   * Initiate file download (triggers file transfer via TransferManager).
   * Returns success to indicate transfer will begin via file:offer socket event.
   */
  private async handleDownloadFile(request: RemoteAccessRequest): Promise<RemoteAccessResponse> {
    const absolutePath = this.resolvePath(request.rootIndex ?? 0, request.path || '');
    if (!absolutePath) {
      return {
        requestId: request.requestId,
        success: false,
        error: 'Access denied: path outside sandbox',
      };
    }

    const info = await this.fsAdapter.getFileInfo(absolutePath);
    if (!info || info.isDirectory) {
      return { requestId: request.requestId, success: false, error: 'File not found' };
    }

    if (info.size > this.config.maxDownloadSize) {
      return { requestId: request.requestId, success: false, error: 'File too large for download' };
    }

    // Return success — the actual file transfer is handled externally
    // by the TransferManager via the file:offer → file:chunk flow
    return {
      requestId: request.requestId,
      success: true,
      data: null, // Caller should initiate file transfer with this file info
    };
  }

  /**
   * Resolve a relative path to an absolute path within the sandbox.
   * Returns null if path is outside sandbox (security check).
   */
  private resolvePath(rootIndex: number, relativePath: string): string | null {
    if (rootIndex < 0 || rootIndex >= this.config.allowedPaths.length) {
      return null;
    }

    const rootPath = this.config.allowedPaths[rootIndex];

    // Block path traversal
    if (relativePath.includes('..')) {
      return null;
    }

    // Remove leading slash
    const cleanRelative = relativePath.replace(/^\/+/, '');

    // Build absolute path
    const separator = rootPath.includes('\\') ? '\\' : '/';
    const absolutePath = cleanRelative
      ? `${rootPath}${separator}${cleanRelative.replace(/\//g, separator)}`
      : rootPath;

    // Ensure the resolved path is still within the root
    const normalizedRoot = rootPath.replace(/[\\/]+$/, '');
    const normalizedPath = absolutePath.replace(/[\\/]+$/, '');

    if (!normalizedPath.startsWith(normalizedRoot)) {
      return null;
    }

    return absolutePath;
  }

  /**
   * Update sandbox configuration (e.g., when user adds/removes shared folders).
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current sandbox config.
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
