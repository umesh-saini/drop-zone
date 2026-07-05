import { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Globe,
  Plus,
  MoreVertical,
  Wifi,
  Check,
  X,
  Link2Off,
  SlidersHorizontal,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/app.store';
import { cn } from '@/lib/utils';
import { PairingModal } from './PairingModal';
import { PermissionsModal } from './PermissionsModal';
import { TerminalModal } from './TerminalModal';
import { dropzone } from '@/services/DropZoneService';
import { syncPairedDevices, syncPendingRequests } from '@/hooks/useDropZone';

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
};

export function DevicesView() {
  const { pairedDevices, pendingRequests, deviceCode, deviceName } = useAppStore();
  const [pairingOpen, setPairingOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [permFor, setPermFor] = useState<{ pairingId: string; name: string } | null>(null);
  const [termFor, setTermFor] = useState<{ pairingId: string; name: string; deviceCode: string } | null>(null);

  const handleAccept = async (pairingId: string) => {
    setBusy(pairingId);
    try {
      await dropzone.acceptPairing(pairingId);
      await syncPendingRequests();
      await syncPairedDevices();
      toast.success('Device paired');
    } catch (err: any) {
      toast.error('Failed to accept', { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (pairingId: string) => {
    setBusy(pairingId);
    try {
      await dropzone.rejectPairing(pairingId);
      await syncPendingRequests();
      toast('Request rejected');
    } catch (err: any) {
      toast.error('Failed to reject', { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  const handleUnpair = async (pairingId: string, name: string) => {
    setBusy(pairingId);
    try {
      await dropzone.unpairDevice(pairingId);
      await syncPairedDevices();
      toast(`Unpaired from ${name}`);
    } catch (err: any) {
      toast.error('Failed to unpair', { description: err.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <PairingModal open={pairingOpen} onClose={() => setPairingOpen(false)} />
      <PermissionsModal
        open={!!permFor}
        onClose={() => setPermFor(null)}
        pairingId={permFor?.pairingId ?? null}
        deviceName={permFor?.name ?? 'this device'}
      />
      <TerminalModal
        open={!!termFor}
        onClose={() => setTermFor(null)}
        pairingId={termFor?.pairingId ?? null}
        deviceName={termFor?.name ?? ''}
        deviceCode={termFor?.deviceCode ?? null}
      />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devices</h1>
          <p className="text-sm text-muted-foreground">
            {pairedDevices.length} paired device{pairedDevices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setPairingOpen(true)}>
          <Plus className="h-4 w-4" />
          Pair Device
        </Button>
      </div>

      {/* Incoming pairing requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Incoming Requests
          </p>
          {pendingRequests.map((req) => {
            const Icon = deviceIcons[req.fromDeviceType] || Monitor;
            return (
              <Card key={req.pairingId} className="border-primary/40 bg-primary/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{req.fromDeviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      wants to pair •{' '}
                      <span className="font-mono">
                        {req.fromDeviceCode.slice(0, 4)}-{req.fromDeviceCode.slice(4)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      disabled={busy === req.pairingId}
                      onClick={() => handleAccept(req.pairingId)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={busy === req.pairingId}
                      onClick={() => handleReject(req.pairingId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* This device */}
      <Card className="mb-4 border-primary/30">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{deviceName || 'This Device'}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {deviceCode ? `${deviceCode.slice(0, 4)}-${deviceCode.slice(4)}` : '--------'}
            </p>
          </div>
          <Badge variant="success">This device</Badge>
        </CardContent>
      </Card>

      {/* Paired devices list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {pairedDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-medium">No paired devices</h3>
            <p className="text-sm text-muted-foreground">
              Click "Pair Device" to connect your phone or another computer.
            </p>
          </div>
        ) : (
          pairedDevices.map((device) => {
            const Icon = deviceIcons[device.deviceType] || Monitor;
            return (
              <Card key={device.pairingId} className="hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                        device.isOnline ? 'bg-success' : 'bg-muted-foreground/50'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{device.deviceName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {device.deviceCode.slice(0, 4)}-{device.deviceCode.slice(4)}
                      </span>
                      <span>•</span>
                      <span>{device.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.isOnline && (
                      <Badge variant="outline" className="text-[10px]">
                        {device.connectionMode === 'local' ? (
                          <>
                            <Wifi className="mr-1 h-3 w-3" /> LAN
                          </>
                        ) : (
                          'Remote'
                        )}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setPermFor({ pairingId: device.pairingId, name: device.deviceName })
                          }
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setTermFor({ pairingId: device.pairingId, name: device.deviceName, deviceCode: device.deviceCode })
                          }
                          disabled={!device.isOnline || device.deviceType !== 'desktop'}
                        >
                          <Terminal className="h-4 w-4" />
                          Terminal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onClick={() => handleUnpair(device.pairingId, device.deviceName)}
                        >
                          <Link2Off className="h-4 w-4" />
                          Unpair device
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
