import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { dropzone } from '@/services/DropZoneService';
import { useAppStore, type PairedDevice } from '@/stores/app.store';

/**
 * useDropZone initializes the DropZone service on mount:
 * registers/loads the device, connects the socket, and wires
 * realtime events into the Zustand store.
 */
export function useDropZone() {
  const initialized = useRef(false);
  const store = useAppStore();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        store.setInitializing(true);

        // 1. Register or load device
        const creds = await dropzone.initialize();
        store.setDevice(creds.deviceCode, creds.deviceName);

        // 2. Wire callbacks
        dropzone.callbacks = {
          onConnectionChange: (connected) => {
            store.setConnected(connected);
            store.setConnectionMode(connected ? 'remote' : 'disconnected');
          },
          onClipboardReceived: (content, fromDevice) => {
            store.addClipboardItem({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              content,
              timestamp: Date.now(),
              source: 'remote',
              fromDevice,
            });
            toast.success(`Clipboard from ${fromDevice.slice(0, 4)}`);
          },
          onClipboardSent: (content) => {
            store.addClipboardItem({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              content,
              timestamp: Date.now(),
              source: 'local',
            });
          },
          onDeviceStatusChange: (deviceCode, online) => {
            const devices = useAppStore
              .getState()
              .pairedDevices.map((d) =>
                d.deviceCode === deviceCode ? { ...d, isOnline: online } : d
              );
            store.setPairedDevices(devices);
            toast(
              online
                ? `${deviceCode.slice(0, 4)} came online`
                : `${deviceCode.slice(0, 4)} went offline`
            );
          },
          onPairingRequest: (fromDevice) => {
            toast(`Pairing request from ${fromDevice.slice(0, 4)}`, {
              description: 'Review it in Devices',
            });
            syncPendingRequests();
          },
          onPairingAccepted: () => {
            toast.success('Pairing accepted');
            syncPairedDevices();
          },
          onTransferProgress: (p) => {
            const existing = useAppStore
              .getState()
              .activeTransfers.find((t) => t.fileId === p.fileId);
            if (existing) {
              store.updateTransfer(p.fileId, {
                status: p.status,
                progress: p.progress,
                speed: p.speed,
              });
            } else {
              store.addTransfer({
                fileId: p.fileId,
                fileName: p.fileName,
                fileSize: p.fileSize,
                direction: p.direction,
                status: p.status,
                progress: p.progress,
                speed: p.speed,
              });
            }
          },
          onFileOffer: (offer) => {
            // Auto-accept offers (UI could prompt instead)
            dropzone.acceptFileOffer(offer.fileId, offer.fromDevice);
            toast(`Receiving ${offer.fileName}`, {
              description: `from ${offer.fromDevice.slice(0, 4)}`,
            });
          },
        };

        // 3. Connect socket
        await dropzone.connect();

        // 4. Load paired devices + pending requests into store
        await syncPairedDevices();
        await syncPendingRequests();

        store.setInitializing(false);
      } catch (err: any) {
        console.error('Init failed:', err);
        store.setInitError(err.message || 'Failed to connect');
        store.setInitializing(false);
        toast.error('Could not connect to server', {
          description: err.message,
        });
      }
    }

    init();

    return () => {
      dropzone.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Load paired devices from the service into the store.
 */
export async function syncPairedDevices(): Promise<void> {
  const store = useAppStore.getState();
  const pairings = await dropzone.refreshPairings();
  const myCode = dropzone.getCredentials()?.deviceCode;

  const devices: PairedDevice[] = [];
  for (const p of pairings) {
    const peerCode = p.deviceACode === myCode ? p.deviceBCode : p.deviceACode;
    const info = await dropzone.api.lookupDevice(peerCode);
    if (info.success && info.data) {
      devices.push({
        pairingId: p.pairingId,
        deviceCode: peerCode,
        deviceName: info.data.deviceName,
        deviceType: info.data.deviceType,
        platform: info.data.platform,
        isOnline: false,
        lastSeen: Date.now(),
        connectionMode: 'remote',
      });
    }
  }
  store.setPairedDevices(devices);
}

/**
 * Load pending incoming pairing requests into the store.
 */
export async function syncPendingRequests(): Promise<void> {
  const store = useAppStore.getState();
  const pending = await dropzone.getPendingIncoming();

  const requests = [];
  for (const p of pending) {
    const info = await dropzone.api.lookupDevice(p.fromDeviceCode);
    requests.push({
      pairingId: p.pairingId,
      fromDeviceCode: p.fromDeviceCode,
      fromDeviceName: info.success && info.data ? info.data.deviceName : p.fromDeviceCode,
      fromDeviceType: (info.success && info.data ? info.data.deviceType : 'desktop') as
        | 'desktop'
        | 'mobile'
        | 'web',
    });
  }
  store.setPendingRequests(requests);
}
