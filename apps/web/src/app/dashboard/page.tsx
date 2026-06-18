'use client';

import { useState } from 'react';
import {
  Zap,
  Monitor,
  Smartphone,
  Globe,
  Clipboard,
  FolderOpen,
  Plus,
  Wifi,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tab = 'devices' | 'clipboard' | 'files';

const mockDevices = [
  {
    id: '1',
    name: 'My Phone',
    type: 'mobile' as const,
    code: 'BDYE-E9BL',
    online: true,
    mode: 'local',
  },
  {
    id: '2',
    name: 'Work Laptop',
    type: 'desktop' as const,
    code: '9892-WXHG',
    online: true,
    mode: 'remote',
  },
  {
    id: '3',
    name: 'iPad',
    type: 'mobile' as const,
    code: 'K3M9-2X7P',
    online: false,
    mode: 'remote',
  },
];

const mockClipboard = [
  { id: '1', content: 'https://github.com/dropzone/app', from: 'My Phone', time: '2m ago' },
  { id: '2', content: 'npm install @dropzone/shared', from: 'Work Laptop', time: '1h ago' },
];

const deviceIcons = { desktop: Monitor, mobile: Smartphone, web: Globe };

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('devices');

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">DropZone</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Connected
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border border-border bg-card p-1">
          {(
            [
              { id: 'devices', label: 'Devices', icon: Monitor },
              { id: 'clipboard', label: 'Clipboard', icon: Clipboard },
              { id: 'files', label: 'Files', icon: FolderOpen },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Devices tab */}
        {tab === 'devices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Paired Devices</h2>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Pair Device
              </Button>
            </div>
            {mockDevices.map((device) => {
              const Icon = deviceIcons[device.type];
              return (
                <Card key={device.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                          device.online ? 'bg-success' : 'bg-muted-foreground/50'
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{device.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{device.code}</p>
                    </div>
                    {device.online && (
                      <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs">
                        {device.mode === 'local' && <Wifi className="h-3 w-3" />}
                        {device.mode === 'local' ? 'LAN' : 'Remote'}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Clipboard tab */}
        {tab === 'clipboard' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Clipboard History</h2>
            {mockClipboard.map((item) => (
              <Card key={item.id} className="group">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono text-sm">{item.content}</p>
                    <p className="text-xs text-muted-foreground">
                      from {item.from} • {item.time}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Files tab */}
        {tab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Files</h2>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Send File
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No active transfers</p>
              <p className="text-sm text-muted-foreground">Drag files here or click Send File</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
