import { useState } from 'react';
import { User, Shield, Wifi, Info, RefreshCw, Plug, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app.store';
import { reconnectDropZone } from '@/hooks/useDropZone';
import { dropzone } from '@/services/DropZoneService';
import * as credStore from '@/services/credentialStore';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { deviceCode, deviceName, connectionMode, isConnected } = useAppStore();
  const [reconnecting, setReconnecting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(deviceName || '');

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await reconnectDropZone();
      toast.success('Reconnected to server');
    } catch (err: any) {
      toast.error('Reconnect failed', { description: err.message });
    } finally {
      setReconnecting(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      const res = await dropzone.api.updateMe({ deviceName: newName.trim() });
      if (res.success) {
        useAppStore.getState().setDevice(deviceCode!, newName.trim());
        toast.success('Device renamed');
        setRenaming(false);
      }
    } catch {
      toast.error('Rename failed');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset this device? You will lose all pairings and need to re-pair.')) return;
    await credStore.clearCredentials();
    window.location.reload();
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your device and preferences</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" />
              Connection
            </CardTitle>
            <CardDescription>
              Connects automatically. Use Reconnect if you go offline or the server was reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  isConnected ? 'bg-success' : 'bg-muted-foreground'
                )}
              />
              <span className="text-sm">
                {isConnected ? 'Connected to server' : 'Disconnected'}
              </span>
              <Badge variant={isConnected ? 'success' : 'secondary'} className="ml-1">
                {connectionMode}
              </Badge>
            </div>
            <Button size="sm" onClick={handleReconnect} disabled={reconnecting} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', reconnecting && 'animate-spin')} />
              {reconnecting ? 'Connecting…' : 'Reconnect'}
            </Button>
          </CardContent>
        </Card>

        {/* Device Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Device
            </CardTitle>
            <CardDescription>Your device identity and connection info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Device Name</span>
              {renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-7 w-32 rounded border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  />
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={handleRename}>
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{deviceName || 'Not set'}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setNewName(deviceName || '');
                      setRenaming(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Device Code</span>
              <span className="text-sm font-mono">
                {deviceCode ? `${deviceCode.slice(0, 4)}-${deviceCode.slice(4)}` : '--------'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection</span>
              <span className="text-sm capitalize">{connectionMode}</span>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Privacy & Security
            </CardTitle>
            <CardDescription>End-to-end encryption settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Encryption</span>
              <span className="text-sm text-success font-medium">AES-256-GCM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Key Exchange</span>
              <span className="text-sm">X25519</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Zero-knowledge server</span>
              <span className="text-sm text-success">Active</span>
            </div>
          </CardContent>
        </Card>

        {/* Network */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="h-4 w-4" />
              Network
            </CardTitle>
            <CardDescription>Local mode and connection preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Local Mode</span>
                <p className="text-xs text-muted-foreground">
                  Direct connection when on same network
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enabled
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Prefer Local</span>
                <p className="text-xs text-muted-foreground">
                  Use LAN when available for faster transfers
                </p>
              </div>
              <Button variant="outline" size="sm">
                On
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm">0.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform</span>
              <span className="text-sm">Desktop (Electron)</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Reset this device identity. You will lose all pairings and need to re-pair.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              Reset Device
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
