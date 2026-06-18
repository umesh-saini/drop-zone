'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Monitor,
  Smartphone,
  Globe,
  Clipboard,
  FolderOpen,
  Plus,
  Copy,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getDropZone } from '@/services/dropzone';
import { formatDeviceCode } from '@dropzone/shared';
import type { PairingInfo } from '@dropzone/shared';

type Tab = 'devices' | 'clipboard' | 'files';

interface PairedDeviceUI {
  pairingId: string;
  code: string;
  name: string;
  type: 'desktop' | 'mobile' | 'web';
  online: boolean;
}

interface ClipItem {
  id: string;
  content: string;
  from: string;
  time: number;
}

const deviceIcons = { desktop: Monitor, mobile: Smartphone, web: Globe };

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('devices');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [myCode, setMyCode] = useState('');
  const [devices, setDevices] = useState<PairedDeviceUI[]>([]);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [pairOpen, setPairOpen] = useState(false);
  const [targetCode, setTargetCode] = useState('');
  const [pairing, setPairing] = useState(false);

  const loadDevices = useCallback(async (myDeviceCode: string) => {
    const dz = getDropZone();
    const pairings = await dz.refreshPairings();
    const result: PairedDeviceUI[] = [];
    for (const p of pairings as PairingInfo[]) {
      const peer = p.deviceACode === myDeviceCode ? p.deviceBCode : p.deviceACode;
      const info = await dz.api.lookupDevice(peer);
      if (info.success && info.data) {
        result.push({
          pairingId: p.pairingId,
          code: peer,
          name: info.data.deviceName,
          type: info.data.deviceType,
          online: false,
        });
      }
    }
    setDevices(result);
  }, []);

  useEffect(() => {
    const dz = getDropZone();
    let mounted = true;

    async function init() {
      try {
        const creds = await dz.initialize();
        if (!mounted) return;
        setMyCode(creds.deviceCode);

        dz.callbacks = {
          onConnectionChange: (c) => setConnected(c),
          onDeviceStatusChange: (code, online) => {
            setDevices((prev) => prev.map((d) => (d.code === code ? { ...d, online } : d)));
          },
          onClipboardReceived: (content, from) => {
            setClips((prev) =>
              [{ id: `${Date.now()}`, content, from, time: Date.now() }, ...prev].slice(0, 50)
            );
          },
        };

        await dz.connect();
        await loadDevices(creds.deviceCode);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
      dz.disconnect();
    };
  }, [loadDevices]);

  const handlePair = async () => {
    const code = targetCode.replace(/-/g, '').toUpperCase().trim();
    if (code.length !== 8) return;
    setPairing(true);
    try {
      await getDropZone().pairWithDevice(code);
      setPairOpen(false);
      setTargetCode('');
      await loadDevices(myCode);
    } catch (err) {
      console.error(err);
    } finally {
      setPairing(false);
    }
  };

  const timeAgo = (t: number) => {
    const d = Date.now() - t;
    if (d < 60000) return 'just now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    return `${Math.floor(d / 3600000)}h ago`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">DropZone</span>
            {myCode && (
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {formatDeviceCode(myCode)}
              </span>
            )}
          </div>
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm',
              connected ? 'text-success' : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connected ? 'bg-success' : 'bg-muted-foreground'
              )}
            />
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
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

        {tab === 'devices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Paired Devices</h2>
              <Button size="sm" className="gap-2" onClick={() => setPairOpen(true)}>
                <Plus className="h-4 w-4" />
                Pair Device
              </Button>
            </div>

            {pairOpen && (
              <Card>
                <CardContent className="flex items-center gap-2 p-4">
                  <input
                    autoFocus
                    value={targetCode}
                    onChange={(e) => setTargetCode(e.target.value)}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center font-mono uppercase tracking-widest outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="sm" onClick={handlePair} disabled={pairing}>
                    {pairing ? 'Pairing…' : 'Pair'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPairOpen(false)}>
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}

            {devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                <Monitor className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No paired devices</p>
                <p className="text-sm text-muted-foreground">
                  Pair your phone or computer to get started
                </p>
              </div>
            ) : (
              devices.map((d) => {
                const Icon = deviceIcons[d.type] || Monitor;
                return (
                  <Card key={d.pairingId}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                            d.online ? 'bg-success' : 'bg-muted-foreground/50'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{d.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatDeviceCode(d.code)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {d.online ? 'Online' : 'Offline'}
                      </span>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {tab === 'clipboard' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Clipboard History</h2>
            {clips.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                <Clipboard className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No clipboard activity yet</p>
                <p className="text-sm text-muted-foreground">
                  Copied content from paired devices appears here
                </p>
              </div>
            ) : (
              clips.map((item) => (
                <Card key={item.id} className="group">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm">{item.content}</p>
                      <p className="text-xs text-muted-foreground">
                        from {item.from.slice(0, 4)} • {timeAgo(item.time)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={() => navigator.clipboard.writeText(item.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'files' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Files</h2>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">File transfers</p>
              <p className="text-sm text-muted-foreground">
                File sending from the web is coming soon — use the desktop or mobile app
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
