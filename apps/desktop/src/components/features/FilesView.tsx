import { useState, useEffect } from 'react';
import { Upload, FileIcon, ArrowUpRight, ArrowDownLeft, X, FolderSearch, Monitor, Smartphone, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/stores/app.store';
import { dropzone } from '@/services/DropZoneService';
import { RemoteExplorer } from './explorer/RemoteExplorer';
import { cn } from '@/lib/utils';

export function FilesView() {
  const { activeTransfers, removeTransfer, pairedDevices } = useAppStore();
  const [tab, setTab] = useState<'transfers' | 'browse'>('transfers');
  const [browseTarget, setBrowseTarget] = useState<string | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);

  // Live backoff if permission revoked
  useEffect(() => {
    if (browseTarget) {
      const device = pairedDevices.find(d => d.deviceCode === browseTarget);
      if (device && device.hasFileAccess === false) {
        setBrowseTarget(null);
        toast.error('Permission Revoked', { description: `${device.deviceName} revoked file access.` });
      }
    }
  }, [pairedDevices, browseTarget]);

  const handleSend = async (targetDeviceCode: string) => {
    setShowSendDialog(false);
    try {
      await dropzone.sendFile(targetDeviceCode);
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
          <Button size="sm" className="gap-2" onClick={() => {
            if (pairedDevices.length === 0) {
              toast.error('No paired device', { description: 'Pair a device first' });
              return;
            }
            setShowSendDialog(true);
          }}>
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
        <div className="flex-1 overflow-y-auto min-h-0">
          {pairedDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pair a device to browse its files
            </p>
          ) : !browseTarget ? (
            <div className="space-y-2">
              {pairedDevices.map((d) => (
                <button
                  key={d.pairingId}
                  onClick={() => {
                    if (d.hasFileAccess !== false) {
                      setBrowseTarget(d.deviceCode);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-colors",
                    d.hasFileAccess === false ? "opacity-60 cursor-not-allowed bg-muted/30" : "hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary">
                    {d.deviceType === 'desktop' ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{d.deviceName}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.hasFileAccess === false ? 'No permission' : 'Browse files'}
                    </div>
                  </div>
                  {d.hasFileAccess === false ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-0">
              <div className="mb-2">
                <Button variant="ghost" size="sm" onClick={() => setBrowseTarget(null)} className="gap-1 -ml-2 text-muted-foreground">
                  <ChevronLeft className="h-4 w-4" />
                  Back to devices
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <RemoteExplorer
                  targetDevice={browseTarget}
                  targetDeviceName={
                    pairedDevices.find((d) => d.deviceCode === browseTarget)?.deviceName || browseTarget
                  }
                />
              </div>
            </div>
          )}
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
                        {transfer.fromDevice && (
                          <>
                            <span>•</span>
                            <span>from {pairedDevices.find(d => d.deviceCode === transfer.fromDevice)?.deviceName || transfer.fromDevice}</span>
                          </>
                        )}
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

      {/* Send Device Selection Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Send file to...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4 max-h-[300px] overflow-y-auto p-1">
            {pairedDevices.map((d) => (
              <button
                key={d.pairingId}
                onClick={() => {
                  if (d.hasFileSend !== false) {
                    handleSend(d.deviceCode);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-colors",
                  d.hasFileSend === false ? "opacity-60 cursor-not-allowed bg-muted/30" : "hover:bg-muted/50 cursor-pointer"
                )}
              >
                <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary">
                  {d.deviceType === 'desktop' ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{d.deviceName}</div>
                  {d.hasFileSend === false && (
                    <div className="text-xs text-muted-foreground">
                      No permission to receive files
                    </div>
                  )}
                </div>
                {d.hasFileSend === false ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
