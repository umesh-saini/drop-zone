import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { dropzone } from '@/services/DropZoneService';
import '@xterm/xterm/css/xterm.css';

interface TerminalModalProps {
  open: boolean;
  onClose: () => void;
  pairingId: string | null;
  deviceName: string;
  deviceCode: string | null;
}

export function TerminalModal({ open, onClose, pairingId, deviceName, deviceCode }: TerminalModalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    if (!open || !pairingId || !deviceCode) return;

    setConnecting(true);

    const term = new Terminal({
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
    dropzone.startTerminalSession(deviceCode, pairingId);

    const handleData = (fromDevice: string, data: string) => {
      if (fromDevice === deviceCode) {
        setConnecting(false);
        term.write(data);
      }
    };

    dropzone.callbacks.onPtyDataReceived = handleData;

    // When typing in UI, send to host
    const onDataDisposable = term.onData((data) => {
      dropzone.sendTerminalData(deviceCode, data);
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        dropzone.resizeTerminalSession(deviceCode, cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize after a short delay to ensure DOM is ready
    setTimeout(() => {
      handleResize();
      setConnecting(false);
    }, 100);

    return () => {
      dropzone.callbacks.onPtyDataReceived = undefined;
      onDataDisposable.dispose();
      term.dispose();
      dropzone.closeTerminalSession(deviceCode);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, pairingId, deviceCode]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Remote Terminal</DialogTitle>
          <DialogDescription>Connected to {deviceName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-[#0a0a0a] rounded-md overflow-hidden relative border border-border">
          {connecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div ref={terminalRef} className="h-full w-full p-2" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
