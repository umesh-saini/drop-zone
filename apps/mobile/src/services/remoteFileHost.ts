import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

export interface RemoteRequest {
  requestId: string;
  type: string;
  path?: string;
  destPath?: string;
  content?: string;
  offset?: number;
  length?: number;
}

export interface RemoteResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
}

export async function handleRemoteRequest(request: RemoteRequest): Promise<RemoteResponse> {
  try {
    switch (request.type) {
      case 'list_roots':
        return await handleListRoots(request.requestId);
      case 'list_directory':
        return await handleListDirectory(request.requestId, request.path || '');
      case 'get_properties':
        return await handleGetProperties(request.requestId, request.path || '');
      case 'read_file':
        return await handleReadFile(request.requestId, request.path || '');
      case 'read_file_base64':
        return await handleReadFileBase64(request.requestId, request.path || '');
      case 'read_file_chunk':
        return await handleReadFileChunk(request.requestId, request.path || '', request.offset || 0, request.length || 0);
      case 'delete':
        return await handleDelete(request.requestId, request.path || '');
      case 'download_file':
        return { requestId: request.requestId, success: true, data: { path: request.path } };
      default:
        return { requestId: request.requestId, success: false, error: 'Unknown request type' };
    }
  } catch (err: any) {
    console.error(`[RemoteFileHost] Request ${request.type} failed:`, err);
    return { requestId: request.requestId, success: false, error: err.message || String(err) };
  }
}

async function handleListRoots(requestId: string): Promise<RemoteResponse> {
  const roots = [];

  const docDir = FileSystem.documentDirectory;
  if (docDir) {
    const p = docDir.endsWith('/') ? docDir.slice(0, -1) : docDir;
    roots.push({ label: 'App Documents', path: p });
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (cacheDir) {
    const p = cacheDir.endsWith('/') ? cacheDir.slice(0, -1) : cacheDir;
    roots.push({ label: 'App Cache', path: p });
  }

  try {
    const savedSafUri = await SecureStore.getItemAsync('savedDirectoryUri');
    if (savedSafUri) {
      let label = 'Shared Folder';
      try {
        const decoded = decodeURIComponent(savedSafUri);
        const parts = decoded.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes(':')) {
          label = lastPart.split(':')[1] || lastPart;
        } else {
          label = lastPart;
        }
      } catch (e) {}
      
      roots.push({ label: `📱 ${label}`, path: savedSafUri });
    }
  } catch (err) {}

  return { requestId, success: true, data: roots };
}

async function handleListDirectory(requestId: string, dirPath: string): Promise<RemoteResponse> {
  const entries: any[] = [];
  
  if (dirPath.startsWith('content://')) {
    if (!FileSystem.StorageAccessFramework) {
       return { requestId, success: false, error: 'StorageAccessFramework not supported on this device/version' };
    }
    const childrenUris = await FileSystem.StorageAccessFramework.readDirectoryAsync(dirPath);
    for (const uri of childrenUris) {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        let name = 'Unknown';
        try {
          const decoded = decodeURIComponent(uri);
          const parts = decoded.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart.includes(':')) {
            name = lastPart.split(':').pop() || lastPart;
          } else {
            name = lastPart;
          }
        } catch (e) {}

        entries.push({
          name,
          path: uri,
          isDirectory: info.isDirectory,
          size: info.exists ? info.size : 0,
          lastModified: info.exists ? info.modificationTime * 1000 : 0,
        });
      } catch (e) {}
    }
  } else {
    const dir = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    const children = await FileSystem.readDirectoryAsync(dir);
    
    for (const child of children) {
      try {
        const childPath = dir + child;
        const info = await FileSystem.getInfoAsync(childPath);
        entries.push({
          name: child,
          path: childPath,
          isDirectory: info.isDirectory,
          size: info.exists ? info.size : 0,
          lastModified: info.exists ? info.modificationTime * 1000 : 0,
        });
      } catch (e) {}
    }
  }

  return { requestId, success: true, data: entries };
}

async function handleGetProperties(requestId: string, filePath: string): Promise<RemoteResponse> {
  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) {
    return { requestId, success: false, error: 'File not found' };
  }
  return {
    requestId,
    success: true,
    data: {
      size: info.size,
      isDirectory: info.isDirectory,
      modified: info.modificationTime * 1000,
    },
  };
}

async function handleReadFile(requestId: string, filePath: string): Promise<RemoteResponse> {
  const content = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
  return { requestId, success: true, data: { content } };
}

async function handleReadFileBase64(requestId: string, filePath: string): Promise<RemoteResponse> {
  const content = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 });
  return { requestId, success: true, data: { content } };
}

async function handleReadFileChunk(requestId: string, filePath: string, offset: number, length: number): Promise<RemoteResponse> {
  const content = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
    position: offset,
    length: length,
  });
  return { requestId, success: true, data: { content } };
}

async function handleDelete(requestId: string, filePath: string): Promise<RemoteResponse> {
  if (filePath.startsWith('content://')) {
    if (!FileSystem.StorageAccessFramework) {
       return { requestId, success: false, error: 'StorageAccessFramework not supported on this device/version' };
    }
    await FileSystem.StorageAccessFramework.deleteAsync(filePath);
  } else {
    await FileSystem.deleteAsync(filePath);
  }
  return { requestId, success: true };
}
