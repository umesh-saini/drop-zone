import { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Monitor, Terminal as TerminalIcon, ChevronLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/stores/app.store';
import { dropzone } from '@/services/DropZoneService';
import { cn } from '@/lib/utils';
import '@xterm/xterm/css/xterm.css';

export function TerminalView() {
  const { pairedDevices } = useAppStore();
  const [activeDeviceCode, setActiveDeviceCode] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connecting, setConnecting] = useState(false);
  const connectingRef = useRef(false);

  // Live backoff if permission revoked
  useEffect(() => {
    if (activeDeviceCode) {
      const device = pairedDevices.find(d => d.deviceCode === activeDeviceCode);
      if (device && device.hasTerminalAccess === false) {
        setActiveDeviceCode(null);
        toast.error('Permission Revoked', { description: `${device.deviceName} revoked terminal access.` });
      }
    }
  }, [pairedDevices, activeDeviceCode]);

  useEffect(() => {
    if (!activeDeviceCode) return;

    const device = pairedDevices.find(d => d.deviceCode === activeDeviceCode);
    if (!device || !device.pairingId) return;

    setConnecting(true);
    connectingRef.current = true;

    const term = new XTerm({
      theme: {
        background: '#0a0a0a',
        foreground: '#f3f4f6',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send PTY request to host
    dropzone.startTerminalSession(activeDeviceCode, device.pairingId);

    const handleData = (fromDevice: string, data: string) => {
      if (fromDevice === activeDeviceCode) {
        if (connectingRef.current) {
          setConnecting(false);
          connectingRef.current = false;
        }
        term.write(data);
      }
    };

    dropzone.callbacks.onPtyDataReceived = handleData;

    // When typing in UI, send to host
    const onDataDisposable = term.onData((data) => {
      dropzone.sendTerminalData(activeDeviceCode, data);
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        dropzone.resizeTerminalSession(activeDeviceCode, cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize after a short delay to ensure DOM is ready
    setTimeout(() => {
      handleResize();
      if (connectingRef.current) {
        setConnecting(false);
        connectingRef.current = false;
      }
    }, 100);

    return () => {
      dropzone.callbacks.onPtyDataReceived = undefined;
      onDataDisposable.dispose();
      term.dispose();
      dropzone.closeTerminalSession(activeDeviceCode);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeDeviceCode]);

  const desktopDevices = pairedDevices.filter((d) => d.deviceType === 'desktop');

  return (
    <div className="flex h-full flex-col p-6">
      {!activeDeviceCode ? (
        <>
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Terminal</h1>
              <p className="text-sm text-muted-foreground">Access remote shell sessions</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {desktopDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <TerminalIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-1 font-medium">No Desktop Devices</h3>
                <p className="text-sm text-muted-foreground">Pair a desktop device to access its terminal.</p>
              </div>
            ) : (
              desktopDevices.map((d) => (
                <button
                  key={d.pairingId}
                  onClick={() => {
                    if (d.hasTerminalAccess !== false) {
                      setActiveDeviceCode(d.deviceCode);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-colors",
                    d.hasTerminalAccess === false ? "opacity-60 cursor-not-allowed bg-muted/30" : "hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{d.deviceName}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.hasTerminalAccess === false ? 'No permission' : 'Connect to shell'}
                    </div>
                  </div>
                  {d.hasTerminalAccess === false ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <TerminalIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col min-h-0">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setActiveDeviceCode(null)} className="gap-1 -ml-2 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              Back to devices
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">
                {pairedDevices.find((d) => d.deviceCode === activeDeviceCode)?.deviceName}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-[#0a0a0a] rounded-lg overflow-hidden border border-border p-2 relative">
            <div ref={terminalRef} className="h-full w-full" />
            {connecting && (
              <div className="absolute inset-0 bg-[#0a0a0a]/80 flex items-center justify-center z-10">
                <span className="text-muted-foreground text-sm">Connecting...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
