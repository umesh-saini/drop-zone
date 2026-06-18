/**
 * Remote file access types.
 *
 * Allows a paired device to browse the file system of another device
 * through the WebSocket relay (all encrypted end-to-end).
 */

/** File entry in a directory listing */
export interface RemoteFileEntry {
  name: string;
  path: string; // relative path within sandbox
  isDirectory: boolean;
  size: number; // bytes (0 for directories)
  lastModified: number; // unix ms
  mimeType?: string;
}

/** Directory listing response */
export interface DirectoryListing {
  path: string; // current directory (relative to sandbox root)
  entries: RemoteFileEntry[];
  parentPath: string | null; // null if at sandbox root
}

/** File preview data */
export interface FilePreview {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Base64 encoded preview data (thumbnail for images, first 10KB for text) */
  data: string;
  isPartial: boolean; // true if only partial content returned
}

/** Sandbox configuration — defines accessible folders */
export interface SandboxConfig {
  /** List of allowed directory paths (absolute on source device) */
  allowedPaths: string[];
  /** Human-friendly labels for each path */
  labels: Record<string, string>;
  /** Max file size for download (bytes, default: 2GB) */
  maxDownloadSize: number;
  /** Max preview size (bytes, default: 10MB) */
  maxPreviewSize: number;
  /** Whether hidden files are accessible */
  showHidden: boolean;
}

/** Remote access request types */
export type RemoteAccessRequestType =
  | 'list_directory'
  | 'get_preview'
  | 'download_file'
  | 'get_sandbox_roots';

/** Remote access request from browser device to source device */
export interface RemoteAccessRequest {
  requestId: string;
  type: RemoteAccessRequestType;
  path?: string; // relative path within sandbox
  rootIndex?: number; // which sandbox root
}

/** Remote access response from source device to browser device */
export interface RemoteAccessResponse {
  requestId: string;
  success: boolean;
  error?: string;
  data?: DirectoryListing | FilePreview | SandboxRoot[] | null;
}

/** Sandbox root directory exposed to remote devices */
export interface SandboxRoot {
  index: number;
  label: string;
  path: string; // display path (not full absolute path)
}

/** Remote file access event handlers (source device) */
export interface RemoteAccessSourceHandlers {
  onListDirectory: (request: RemoteAccessRequest) => Promise<DirectoryListing | null>;
  onGetPreview: (request: RemoteAccessRequest) => Promise<FilePreview | null>;
  onDownloadFile: (request: RemoteAccessRequest) => Promise<void>;
  onGetSandboxRoots: () => Promise<SandboxRoot[]>;
}

/** Platform-specific file system adapter for remote access */
export interface RemoteFileSystemAdapter {
  /** List entries in a directory */
  listDirectory(absolutePath: string, showHidden: boolean): Promise<RemoteFileEntry[]>;
  /** Get file info */
  getFileInfo(absolutePath: string): Promise<RemoteFileEntry | null>;
  /** Read file for preview (first N bytes) */
  readPreview(absolutePath: string, maxBytes: number): Promise<Uint8Array>;
  /** Check if path exists and is accessible */
  pathExists(absolutePath: string): Promise<boolean>;
  /** Check if path is a directory */
  isDirectory(absolutePath: string): Promise<boolean>;
}
