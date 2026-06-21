import { useState } from 'react';
import { Upload, FileIcon, ArrowUpRight, ArrowDownLeft, X, FolderSearch } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app.store';
import { dropzone } from '@/services/DropZoneService';
import { RemoteExplorer } from './explorer/RemoteExplorer';
import { cn } from '@/lib/utils';

export function FilesView() {
  const { activeTransfers, removeTransfer, pairedDevices } = useAppStore();
  const [tab, setTab] = useState<'transfers' | 'browse'>('transfers');
  const [browseTarget, setBrowseTarget] = useState<string | null>(null);

  const handleSend = async () => {
    const online = pairedDevices.filter((d) => d.isOnline);
    const target = online[0] || pairedDevices[0];
    if (!target) {
      toast.error('No paired device', { description: 'Pair a device first' });
      return;
    }
    try {
      await dropzone.sendFile(target.deviceCode);
    } catch (err: any) {
      toast.error('Send failed', { description: err.message });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Files</h1>
          <p className="text-sm text-muted-foreground">Send, receive & browse remote files</p>
        </div>
        {tab === 'transfers' && (
          <Button size="sm" className="gap-2" onClick={handleSend}>
            <Upload className="h-4 w-4" />
            Send File
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border p-1">
        <button
          onClick={() => setTab('transfers')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'transfers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Transfers
        </button>
        <button
          onClick={() => {
            setTab('browse');
            if (!browseTarget && pairedDevices.length > 0) {
              const online = pairedDevices.find((d) => d.isOnline);
              setBrowseTarget(online?.deviceCode || pairedDevices[0].deviceCode);
            }
          }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'browse' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          <FolderSearch className="h-3.5 w-3.5" />
          Browse Device
        </button>
      </div>

      {/* Browse view */}
      {tab === 'browse' && (
        <div className="flex-1 overflow-y-auto">
          {pairedDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pair a device to browse its files
            </p>
          ) : browseTarget ? (
            <RemoteExplorer
              targetDevice={browseTarget}
              targetDeviceName={
                pairedDevices.find((d) => d.deviceCode === browseTarget)?.deviceName || browseTarget
              }
            />
          ) : null}
        </div>
      )}

      {/* Transfers view */}
      {tab === 'transfers' && (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {activeTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <FileIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium">No active transfers</h3>
              <p className="text-sm text-muted-foreground">
                Send a file to a paired device or browse remote files.
              </p>
            </div>
          ) : (
            activeTransfers.map((transfer) => (
              <Card key={transfer.fileId}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      {transfer.direction === 'send' ? (
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{transfer.fileName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(transfer.fileSize)}</span>
                        {transfer.status === 'in_progress' && (
                          <>
                            <span>•</span>
                            <span>{formatSpeed(transfer.speed)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          transfer.status === 'completed'
                            ? 'success'
                            : transfer.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {transfer.status === 'in_progress'
                          ? `${transfer.progress}%`
                          : transfer.status}
                      </Badge>
                      {['completed', 'failed'].includes(transfer.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeTransfer(transfer.fileId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {transfer.status === 'in_progress' && (
                    <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${transfer.progress}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
