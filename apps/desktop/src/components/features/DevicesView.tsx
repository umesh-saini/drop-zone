import { Monitor, Smartphone, Globe, Plus, MoreVertical, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app.store';
import { cn } from '@/lib/utils';

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
};

export function DevicesView() {
  const { pairedDevices, deviceCode, deviceName } = useAppStore();

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devices</h1>
          <p className="text-sm text-muted-foreground">
            {pairedDevices.length} paired device{pairedDevices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Pair Device
        </Button>
      </div>

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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
