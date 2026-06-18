import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { encodeQRData, generateQRData, formatDeviceCode } from '@dropzone/shared';
import { dropzone } from '@/services/DropZoneService';
import { syncPairedDevices } from '@/hooks/useDropZone';
import { useAppStore } from '@/stores/app.store';

interface PairingModalProps {
  open: boolean;
  onClose: () => void;
}

export function PairingModal({ open, onClose }: PairingModalProps) {
  const { deviceCode, deviceName } = useAppStore();
  const [mode, setMode] = useState<'show' | 'enter'>('show');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [targetCode, setTargetCode] = useState('');
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    if (!open || !deviceCode) return;
    const creds = dropzone.getCredentials();
    if (!creds) return;

    // Generate QR with this device's pairing data
    const qrData = generateQRData(creds.deviceCode, creds.publicKey, creds.deviceName, 'desktop');
    const qrString = encodeQRData(qrData);
    QRCode.toDataURL(qrString, {
      width: 240,
      margin: 1,
      color: { dark: '#fafafa', light: '#0a0a0c' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [open, deviceCode]);

  const handlePair = async () => {
    const code = targetCode.replace(/-/g, '').toUpperCase().trim();
    if (code.length !== 8) {
      toast.error('Enter a valid 8-character device code');
      return;
    }
    setPairing(true);
    try {
      await dropzone.pairWithDevice(code);
      toast.success('Pairing request sent', {
        description: 'Waiting for the other device to accept',
      });
      await syncPairedDevices();
      onClose();
    } catch (err: any) {
      toast.error('Pairing failed', { description: err.message });
    } finally {
      setPairing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pair a Device</DialogTitle>
          <DialogDescription>
            {mode === 'show'
              ? 'Scan this code from another device, or enter their code.'
              : "Enter the other device's 8-character code."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setMode('show')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
              mode === 'show' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Show My Code
          </button>
          <button
            onClick={() => setMode('enter')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
              mode === 'enter' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Enter Code
          </button>
        </div>

        {mode === 'show' ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Pairing QR" className="rounded-lg" />
            ) : (
              <div className="h-[240px] w-[240px] animate-pulse rounded-lg bg-secondary" />
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Your device code</p>
              <p className="font-mono text-lg font-semibold">
                {deviceCode ? formatDeviceCode(deviceCode) : '--------'}
              </p>
              <p className="text-xs text-muted-foreground">{deviceName}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <input
              autoFocus
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={9}
              className="rounded-md border border-input bg-background px-4 py-3 text-center font-mono text-lg uppercase tracking-widest outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={handlePair} disabled={pairing}>
              {pairing ? 'Pairing...' : 'Send Pairing Request'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
