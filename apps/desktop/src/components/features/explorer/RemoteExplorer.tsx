import { useState, useEffect } from 'react';
import {
  FolderOpen,
  File as FileIcon,
  ArrowLeft,
  Home,
  Download,
  Image,
  FileText,
  Music,
  Video,
  Archive,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/stores/app.store';
import { dropzone } from '@/services/DropZoneService';
import { toast } from 'sonner';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  mimeType?: string;
}

interface RootDir {
  label: string;
  path: string;
}

const fileTypeIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return Image;
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return Video;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return Music;
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return Archive;
  if (['txt', 'md', 'json', 'ts', 'js', 'py', 'html', 'css', 'pdf', 'doc', 'docx'].includes(ext))
    return FileText;
  return FileIcon;
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

interface RemoteExplorerProps {
  targetDevice: string;
  targetDeviceName: string;
}

export function RemoteExplorer({ targetDevice, targetDeviceName }: RemoteExplorerProps) {
  const [loading, setLoading] = useState(false);
  const [roots, setRoots] = useState<RootDir[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [noPermission, setNoPermission] = useState(false);

  // Check permission
  const pairedDevices = useAppStore((s) => s.pairedDevices);
  const device = pairedDevices.find((d) => d.deviceCode === targetDevice);

  const sendRequest = (req: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullReq = { ...req, requestId };

      const timeout = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, 10000);

      // Listen for the response
      const handler = (data: any) => {
        if (data.response?.requestId === requestId) {
          clearTimeout(timeout);
          // Remove listener (one-shot)
          resolve(data.response);
        }
      };

      // Use a temporary approach: store a pending promise
      (dropzone as any)._pendingRemoteResponses =
        (dropzone as any)._pendingRemoteResponses || new Map();
      (dropzone as any)._pendingRemoteResponses.set(requestId, {
        resolve: (r: any) => {
          clearTimeout(timeout);
          resolve(r);
        },
        reject,
      });

      dropzone.sendRemoteRequest(targetDevice, fullReq);

      // Resolve when response comes via the onRemoteResponse callback
      setTimeout(() => {
        const pending = (dropzone as any)._pendingRemoteResponses?.get(requestId);
        if (pending) {
          // Still waiting — will be resolved by the response handler
        }
      }, 0);
    });
  };

  useEffect(() => {
    loadRoots();
  }, [targetDevice]);

  // Wire the response handler
  useEffect(() => {
    const originalHandler = dropzone.callbacks.onRemoteResponse;
    dropzone.callbacks.onRemoteResponse = (response: any) => {
      const pendingMap = (dropzone as any)._pendingRemoteResponses;
      if (pendingMap && response.requestId) {
        const pending = pendingMap.get(response.requestId);
        if (pending) {
          pendingMap.delete(response.requestId);
          pending.resolve(response);
        }
      }
      originalHandler?.(response);
    };
    return () => {
      dropzone.callbacks.onRemoteResponse = originalHandler;
    };
  }, []);

  const loadRoots = async () => {
    setLoading(true);
    setNoPermission(false);
    try {
      const res = await sendRequest({ type: 'list_roots' });
      if (res.success) {
        setRoots(res.data);
        setCurrentPath(null);
        setEntries([]);
      } else if (res.error?.includes('permission')) {
        setNoPermission(true);
      }
    } catch (err: any) {
      if (err.message.includes('permission')) {
        setNoPermission(true);
      } else {
        toast.error('Failed to load', { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = async (dirPath: string) => {
    setLoading(true);
    try {
      const res = await sendRequest({ type: 'list_directory', path: dirPath });
      if (res.success) {
        if (currentPath) setPathHistory((h) => [...h, currentPath]);
        setCurrentPath(dirPath);
        const sorted = (res.data as FileEntry[]).sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      } else {
        toast.error(res.error || 'Access denied');
      }
    } catch (err: any) {
      toast.error('Browse failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    const prev = pathHistory.pop();
    if (prev) {
      setPathHistory([...pathHistory]);
      navigateTo(prev);
    } else {
      setCurrentPath(null);
      setEntries([]);
    }
  };

  if (noPermission) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Permission denied</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {targetDeviceName} hasn't enabled remote file browsing for you. They can enable it in
          Permissions.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show roots (initial view)
  if (!currentPath) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          {targetDeviceName}'s folders
        </p>
        {roots.map((root) => (
          <Card
            key={root.path}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigateTo(root.path)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{root.label}</p>
                <p className="text-xs text-muted-foreground truncate">{root.path}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show directory listing
  return (
    <div className="space-y-2">
      {/* Breadcrumb/nav */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadRoots}>
          <Home className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground truncate flex-1 font-mono">{currentPath}</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Empty folder</p>
      ) : (
        entries.map((entry) => {
          const Icon = entry.isDirectory ? FolderOpen : fileTypeIcon(entry.name);
          return (
            <div
              key={entry.path}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 cursor-pointer transition-colors"
              onClick={() => entry.isDirectory && navigateTo(entry.path)}
            >
              <Icon
                className={`h-4 w-4 ${entry.isDirectory ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <p className="text-sm flex-1 truncate">{entry.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(entry.size)}</p>
              {!entry.isDirectory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info('Download: ' + entry.name, {
                      description: 'Coming in the next iteration',
                    });
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
