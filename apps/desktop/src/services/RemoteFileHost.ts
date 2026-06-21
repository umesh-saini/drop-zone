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
  type: 'list_roots' | 'list_directory' | 'download_file' | 'read_file' | 'read_file_base64' | 'read_file_chunk' | 'extract_archive' | 'write_file' | 'copy' | 'move' | 'delete' | 'rename' | 'get_properties';
  path?: string;
  destPath?: string;
  content?: string;
  offset?: number;
  length?: number;
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
      case 'read_file':
        return await handleReadFile(request.requestId, request.path || '');
      case 'read_file_base64':
        return await handleReadFileBase64(request.requestId, request.path || '');
      case 'read_file_chunk':
        return await handleReadFileChunk(request.requestId, request.path || '', request.offset || 0, request.length || 0);
      case 'extract_archive':
        return await handleExtractArchive(request.requestId, request.path || '', request.destPath || '');
      case 'write_file':
        return await handleWriteFile(request.requestId, request.path || '', request.content || '');
      case 'copy':
        return await handleCopy(request.requestId, request.path || '', request.destPath || '');
      case 'move':
        return await handleMove(request.requestId, request.path || '', request.destPath || '');
      case 'delete':
        return await handleDelete(request.requestId, request.path || '');
      case 'rename':
        return await handleRename(request.requestId, request.path || '', request.destPath || '');
      case 'get_properties':
        return await handleGetProperties(request.requestId, request.path || '');
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

async function handleReadFile(requestId: string, filePath: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  const content = await window.electronAPI.readFile(filePath);
  return { requestId, success: true, data: { content } };
}

async function handleReadFileBase64(requestId: string, filePath: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  const content = await window.electronAPI.readFileBase64(filePath);
  return { requestId, success: true, data: { content } };
}

async function handleReadFileChunk(requestId: string, filePath: string, offset: number, length: number): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  try {
    const base64Chunk = await window.electronAPI.readChunk(filePath, offset, length);
    return { requestId, success: true, data: { content: base64Chunk } };
  } catch (err: any) {
    return { requestId, success: false, error: err.message };
  }
}

async function handleExtractArchive(requestId: string, filePath: string, destPath: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  const res = await window.electronAPI.extractArchive(filePath, destPath);
  return { requestId, success: res.success, error: res.error };
}

async function handleWriteFile(requestId: string, filePath: string, content: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  await window.electronAPI.writeFile(filePath, content);
  return { requestId, success: true };
}

async function handleCopy(requestId: string, src: string, dest: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  await window.electronAPI.copyFile(src, dest);
  return { requestId, success: true };
}

async function handleMove(requestId: string, src: string, dest: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  await window.electronAPI.moveFile(src, dest);
  return { requestId, success: true };
}

async function handleDelete(requestId: string, filePath: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  await window.electronAPI.deleteFile(filePath);
  return { requestId, success: true };
}

async function handleRename(requestId: string, src: string, dest: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  await window.electronAPI.renameFile(src, dest);
  return { requestId, success: true };
}

async function handleGetProperties(requestId: string, filePath: string): Promise<RemoteResponse> {
  if (!window.electronAPI) return { requestId, success: false, error: 'Not running in Electron' };
  const props = await window.electronAPI.getProperties(filePath);
  return { requestId, success: true, data: props };
}
