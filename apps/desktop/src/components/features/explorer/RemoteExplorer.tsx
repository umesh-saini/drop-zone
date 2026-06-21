import { useState, useEffect } from 'react';
import {
  FolderOpen,
  File as FileIcon,
  ArrowLeft,
  Home,
  Download,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Archive,
  Loader2,
  Lock,
  MoreVertical,
  Trash2,
  Edit2,
  Info,
  Copy,
  Scissors,
  ClipboardPaste,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return ImageIcon;
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

  // Modals state
  const [showImage, setShowImage] = useState(false);
  const [imageBase64, setImageBase64] = useState('');
  const [viewingFile, setViewingFile] = useState<string>('');

  const [showText, setShowText] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPath, setEditingPath] = useState('');

  const [showRename, setShowRename] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);

  const [showProperties, setShowProperties] = useState(false);
  const [propertiesData, setPropertiesData] = useState<any>(null);

  const [clipboardAction, setClipboardAction] = useState<{ type: 'copy' | 'move'; entry: FileEntry } | null>(null);

  // Check permission
  const pairedDevices = useAppStore((s) => s.pairedDevices);
  const device = pairedDevices.find((d) => d.deviceCode === targetDevice);

  const sendRequest = (req: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullReq = { ...req, requestId };

      const timeout = setTimeout(() => reject(new Error('Request timed out')), 10000);

      const handler = (data: any) => {
        if (data.response?.requestId === requestId) {
          clearTimeout(timeout);
          resolve(data.response);
        }
      };

      (dropzone as any)._pendingRemoteResponses = (dropzone as any)._pendingRemoteResponses || new Map();
      (dropzone as any)._pendingRemoteResponses.set(requestId, {
        resolve: (r: any) => {
          clearTimeout(timeout);
          resolve(r);
        },
        reject,
      });

      dropzone.sendRemoteRequest(targetDevice, fullReq);
    });
  };

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

  useEffect(() => {
    loadRoots();
  }, [targetDevice]);

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
      if (err.message.includes('permission')) setNoPermission(true);
      else toast.error('Failed to load', { description: err.message });
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

  const refreshCurrentDir = async () => {
    if (currentPath) {
      const res = await sendRequest({ type: 'list_directory', path: currentPath });
      if (res.success) {
        const sorted = (res.data as FileEntry[]).sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      }
    }
  };

  const handleAction = async (action: string, entry: FileEntry) => {
    switch (action) {
      case 'download':
        toast.info('Downloading...', { description: entry.name });
        try {
          const res = await sendRequest({ type: 'download_file', path: entry.path });
          if (!res.success) toast.error('Download failed', { description: res.error });
        } catch (e: any) {
          toast.error('Download error', { description: e.message });
        }
        break;

      case 'delete':
        if (!confirm(`Are you sure you want to delete ${entry.name}?`)) return;
        setLoading(true);
        try {
          const res = await sendRequest({ type: 'delete', path: entry.path });
          if (res.success) {
            setEntries((prev) => prev.filter((e) => e.path !== entry.path));
            toast.success('Deleted');
          } else {
            toast.error('Delete failed', { description: res.error });
          }
        } catch (e: any) {
          toast.error('Delete error', { description: e.message });
        } finally {
          setLoading(false);
        }
        break;

      case 'rename':
        setRenameTarget(entry);
        setRenameInput(entry.name);
        setShowRename(true);
        break;

      case 'properties':
        setLoading(true);
        try {
          const res = await sendRequest({ type: 'get_properties', path: entry.path });
          if (res.success) {
            setPropertiesData({ ...res.data, name: entry.name, path: entry.path });
            setShowProperties(true);
          } else {
            toast.error('Failed to get properties', { description: res.error });
          }
        } catch (e: any) {
          toast.error('Properties error', { description: e.message });
        } finally {
          setLoading(false);
        }
        break;

      case 'copy':
        setClipboardAction({ type: 'copy', entry });
        toast.success(`Copied ${entry.name} to clipboard`);
        break;

      case 'move':
        setClipboardAction({ type: 'move', entry });
        toast.success(`Moved ${entry.name} to clipboard`);
        break;

      case 'view':
        const ext = entry.name.split('.').pop()?.toLowerCase();
        // Image Preview
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
          setLoading(true);
          try {
            if (entry.size > 1024 * 512) {
              // Read chunks
              let allBase64 = '';
              const CHUNK_SIZE = 512 * 1024;
              const totalChunks = Math.ceil(entry.size / CHUNK_SIZE);
              for (let i = 0; i < totalChunks; i++) {
                const offset = i * CHUNK_SIZE;
                const length = Math.min(CHUNK_SIZE, entry.size - offset);
                const res = await sendRequest({ type: 'read_file_chunk', path: entry.path, offset, length });
                if (!res.success) throw new Error(res.error || 'Chunk read failed');
                allBase64 += res.data.content;
              }
              setImageBase64(`data:image/${ext};base64,${allBase64}`);
            } else {
              const res = await sendRequest({ type: 'read_file_base64', path: entry.path });
              if (!res.success) throw new Error(res.error || 'Read failed');
              setImageBase64(`data:image/${ext};base64,${res.data.content}`);
            }
            setViewingFile(entry.name);
            setShowImage(true);
          } catch (e: any) {
            toast.error('Cannot read image', { description: e.message });
          } finally {
            setLoading(false);
          }
          return;
        }

        // Text view
        if (['txt', 'md', 'json', 'ts', 'js', 'html', 'css', 'csv', 'log', 'env'].includes(ext || '')) {
          setLoading(true);
          try {
            const res = await sendRequest({ type: 'read_file', path: entry.path });
            if (res.success) {
              setTextContent(res.data.content);
              setViewingFile(entry.name);
              setEditingPath(entry.path);
              setIsEditing(false);
              setShowText(true);
            } else {
              throw new Error(res.error || 'Read failed');
            }
          } catch (e: any) {
            toast.error('Cannot read file', { description: e.message });
          } finally {
            setLoading(false);
          }
          return;
        }
        toast.error('Preview not supported', { description: `Cannot preview .${ext} files` });
        break;
    }
  };

  const executeRename = async () => {
    if (!renameTarget || !currentPath || !renameInput.trim()) return;
    if (renameInput === renameTarget.name) {
      setShowRename(false);
      return;
    }
    
    // Construct new path by replacing the old filename at the end of the path
    const destPath = renameTarget.path.replace(new RegExp(`${renameTarget.name}$`), renameInput.trim());
    
    setLoading(true);
    try {
      const res = await sendRequest({ type: 'rename', path: renameTarget.path, destPath });
      if (res.success) {
        toast.success('Renamed successfully');
        setShowRename(false);
        refreshCurrentDir();
      } else {
        toast.error('Rename failed', { description: res.error });
      }
    } catch (e: any) {
      toast.error('Rename error', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const executeSaveText = async () => {
    if (!editingPath) return;
    setLoading(true);
    try {
      const res = await sendRequest({ type: 'write_file', path: editingPath, content: textContent });
      if (res.success) {
        toast.success('Saved successfully');
        setIsEditing(false);
        refreshCurrentDir();
      } else {
        toast.error('Save failed', { description: res.error });
      }
    } catch (e: any) {
      toast.error('Save error', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    if (!clipboardAction || !currentPath) return;
    setLoading(true);
    
    const src = clipboardAction.entry.path;
    const destPath = currentPath + (currentPath.endsWith('/') ? '' : '/') + clipboardAction.entry.name;
    
    try {
      const res = await sendRequest({ type: clipboardAction.type, path: src, destPath });
      if (res.success) {
        toast.success(`Successfully ${clipboardAction.type === 'copy' ? 'copied' : 'moved'}`);
        if (clipboardAction.type === 'move') {
          setClipboardAction(null);
        }
        refreshCurrentDir();
      } else {
        toast.error('Paste failed', { description: res.error });
      }
    } catch (e: any) {
      toast.error('Paste error', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (noPermission) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Permission denied</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {targetDeviceName} hasn't enabled remote file browsing for you. They can enable it in Permissions.
        </p>
      </div>
    );
  }

  if (loading && entries.length === 0 && roots.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show roots (initial view)
  if (!currentPath) {
    return (
      <div className="space-y-2 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-10 flex justify-center pt-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
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
                <p className="text-xs text-muted-foreground truncate">
                  {root.label.includes('📱') ? 'User Shared Folder' : 'App Internal Storage'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show directory listing
  return (
    <div className="space-y-2 relative h-full flex flex-col">
      {loading && (
        <div className="absolute inset-0 bg-background/50 z-10 flex justify-center pt-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      
      {/* Breadcrumb/nav */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadRoots}>
          <Home className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground truncate flex-1 font-mono">{currentPath}</p>
        
        {clipboardAction && (
          <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={handlePaste}>
            <ClipboardPaste className="mr-2 h-3.5 w-3.5" />
            Paste
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Empty folder</p>
        ) : (
          entries.map((entry) => {
            const Icon = entry.isDirectory ? FolderOpen : fileTypeIcon(entry.name);
            return (
              <div
                key={entry.path}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 cursor-pointer transition-colors group"
                onClick={() => entry.isDirectory && navigateTo(entry.path)}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${entry.isDirectory ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <p className="text-sm flex-1 truncate">{entry.name}</p>
                <p className="text-xs text-muted-foreground flex-shrink-0">{formatSize(entry.size)}</p>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!entry.isDirectory && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('download', entry);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {!entry.isDirectory && (
                        <>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('view', entry); }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Preview / Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('download', entry); }}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <div className="h-px bg-border my-1 mx-1" />
                        </>
                      )}
                      
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('rename', entry); }}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('copy', entry); }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('move', entry); }}>
                        <Scissors className="mr-2 h-4 w-4" />
                        Move
                      </DropdownMenuItem>
                      
                      <div className="h-px bg-border my-1 mx-1" />
                      
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('properties', entry); }}>
                        <Info className="mr-2 h-4 w-4" />
                        Properties
                      </DropdownMenuItem>
                      
                      <div className="h-px bg-border my-1 mx-1" />
                      
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction('delete', entry); }} className="text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Modal */}
      <Dialog open={showImage} onOpenChange={setShowImage}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <img
            src={imageBase64}
            alt="Preview"
            className="h-auto max-h-[85vh] w-full object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>

      {/* Text Modal */}
      <Dialog open={showText} onOpenChange={setShowText}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-4 bg-background border-border">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="truncate font-mono text-sm max-w-[70%]">{viewingFile}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => isEditing ? executeSaveText() : setIsEditing(true)}
              >
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-secondary/50 mt-4">
            {isEditing ? (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full h-full min-h-[50vh] bg-transparent p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            ) : (
              <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words">{textContent}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Rename Modal */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowRename(false)}>Cancel</Button>
            <Button onClick={executeRename}>Rename</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Properties Modal */}
      <Dialog open={showProperties} onOpenChange={setShowProperties}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Properties</DialogTitle>
          </DialogHeader>
          {propertiesData && (
            <div className="space-y-3 py-4 text-sm">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold col-span-1">Name:</span>
                <span className="col-span-3 text-muted-foreground break-all">{propertiesData.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold col-span-1">Path:</span>
                <span className="col-span-3 text-muted-foreground break-all font-mono text-xs">{propertiesData.path}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold col-span-1">Type:</span>
                <span className="col-span-3 text-muted-foreground">{propertiesData.isDirectory ? 'Folder' : 'File'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold col-span-1">Size:</span>
                <span className="col-span-3 text-muted-foreground">{formatSize(propertiesData.size)}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold col-span-1">Modified:</span>
                <span className="col-span-3 text-muted-foreground">
                  {propertiesData.lastModified ? new Date(propertiesData.lastModified).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowProperties(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
