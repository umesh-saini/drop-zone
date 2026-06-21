import * as FileSystem from 'expo-file-system/legacy';

/**
 * Mobile remote file host — responds to browse requests from paired devices.
 *
 * Exposes accessible directories on the phone:
 * - Documents (app document directory)
 * - Cache (app cache directory)
 * - DropZone received files
 *
 * On Android/iOS, apps can only access their own sandboxed directories.
 * For broader access, a dev build with SAF or MediaLibrary would be needed.
 */

interface RemoteRequest {
  requestId: string;
  type: 'list_roots' | 'list_directory' | 'download_file';
  path?: string;
}

interface RemoteResponse {
  requestId: string;
  success: boolean;
  error?: string;
  data?: any;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  mimeType?: string;
}

export async function handleRemoteRequest(request: RemoteRequest): Promise<RemoteResponse> {
  try {
    switch (request.type) {
      case 'list_roots':
        return handleListRoots(request.requestId);
      case 'list_directory':
        return await handleListDirectory(request.requestId, request.path || '');
      default:
        return { requestId: request.requestId, success: false, error: 'Unknown request type' };
    }
  } catch (err: any) {
    return { requestId: request.requestId, success: false, error: err.message };
  }
}

function handleListRoots(requestId: string): RemoteResponse {
  const roots = [
    { label: 'Documents', path: FileSystem.documentDirectory || '' },
    { label: 'Cache', path: FileSystem.cacheDirectory || '' },
    { label: 'DropZone Files', path: (FileSystem.documentDirectory || '') + 'dropzone/' },
  ].filter((r) => r.path.length > 0);

  return { requestId, success: true, data: roots };
}

async function handleListDirectory(requestId: string, dirPath: string): Promise<RemoteResponse> {
  // Security: block path traversal
  if (dirPath.includes('..')) {
    return { requestId, success: false, error: 'Path traversal not allowed' };
  }

  // Ensure the path is within allowed directories
  const docDir = FileSystem.documentDirectory || '';
  const cacheDir = FileSystem.cacheDirectory || '';
  if (!dirPath.startsWith(docDir) && !dirPath.startsWith(cacheDir)) {
    return { requestId, success: false, error: 'Access denied: path outside allowed directories' };
  }

  try {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      return { requestId, success: false, error: 'Directory not found' };
    }

    const items = await FileSystem.readDirectoryAsync(dirPath);
    const entries: FileEntry[] = [];

    for (const name of items) {
      const fullPath = dirPath.endsWith('/') ? dirPath + name : dirPath + '/' + name;
      try {
        const info = await FileSystem.getInfoAsync(fullPath);
        entries.push({
          name,
          path: fullPath,
          isDirectory: info.isDirectory || false,
          size: (info as any).size || 0,
          lastModified: (info as any).modificationTime
            ? (info as any).modificationTime * 1000
            : Date.now(),
          mimeType: info.isDirectory ? undefined : guessMimeType(name),
        });
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort: folders first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { requestId, success: true, data: entries };
  } catch (err: any) {
    return { requestId, success: false, error: 'Failed to read directory: ' + err.message };
  }
}

function guessMimeType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    json: 'application/json',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}
