/**
 * RemoteFileHost handles incoming remote file access requests from
 * paired devices. Uses Electron IPC to access the local file system.
 *
 * Runs on the device whose files are being browsed.
 */

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  mimeType?: string;
}

export interface RemoteRequest {
  requestId: string;
  type: 'list_roots' | 'list_directory' | 'download_file';
  path?: string;
}

export interface RemoteResponse {
  requestId: string;
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Handle an incoming remote file access request.
 */
export async function handleRemoteRequest(request: RemoteRequest): Promise<RemoteResponse> {
  try {
    switch (request.type) {
      case 'list_roots':
        return await handleListRoots(request.requestId);
      case 'list_directory':
        return await handleListDirectory(request.requestId, request.path || '');
      case 'download_file':
        return { requestId: request.requestId, success: true, data: { path: request.path } };
      default:
        return { requestId: request.requestId, success: false, error: 'Unknown request type' };
    }
  } catch (err: any) {
    return { requestId: request.requestId, success: false, error: err.message };
  }
}

async function handleListRoots(requestId: string): Promise<RemoteResponse> {
  if (!window.electronAPI) {
    return { requestId, success: false, error: 'Not running in Electron' };
  }
  const dirs = await window.electronAPI.getHomeDirs();
  const roots = [
    { label: 'Home', path: dirs.home },
    { label: 'Documents', path: dirs.documents },
    { label: 'Downloads', path: dirs.downloads },
    { label: 'Desktop', path: dirs.desktop },
    { label: 'Pictures', path: dirs.pictures },
  ];
  return { requestId, success: true, data: roots };
}

async function handleListDirectory(requestId: string, dirPath: string): Promise<RemoteResponse> {
  if (!window.electronAPI) {
    return { requestId, success: false, error: 'Not running in Electron' };
  }

  // Security: block path traversal
  if (dirPath.includes('..')) {
    return { requestId, success: false, error: 'Path traversal not allowed' };
  }

  const entries = await window.electronAPI.listDirectory(dirPath, false);
  return { requestId, success: true, data: entries };
}
