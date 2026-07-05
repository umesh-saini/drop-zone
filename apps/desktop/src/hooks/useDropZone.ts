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
          onPairingRevoked: () => {
            toast('A device was unpaired');
            syncPairedDevices();
          },
          onPermissionUpdate: () => {
            syncPairedDevices();
            syncTrayPermissions().catch(console.error);
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

        // 5. Setup tray IPC listeners
        if (window.electronAPI?.onTogglePermission) {
          window.electronAPI.onTogglePermission(async (data) => {
            try {
              for (const type of data.types) {
                await dropzone.api.updatePermission(data.pairingId, type, data.granted);
              }
              await syncTrayPermissions();
            } catch (err) {
              console.error('Failed to update permission from tray:', err);
              toast.error('Failed to update permission');
              await syncTrayPermissions(); // Revert toggle in tray
            }
          });
        }

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
 * Manually reconnect: re-register if needed, reconnect socket, refresh state.
 * Used by the "Reconnect" button in Settings.
 */
export async function reconnectDropZone(): Promise<void> {
  const store = useAppStore.getState();
  try {
    store.setConnectionMode('disconnected');
    const creds = await dropzone.initialize();
    store.setDevice(creds.deviceCode, creds.deviceName);
    await dropzone.connect();
    await syncPairedDevices();
    await syncPendingRequests();
  } catch (err: any) {
    store.setInitError(err.message || 'Reconnect failed');
    throw err;
  }
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
      // Check if peer granted us file_access_read, file_receive, terminal_access
      let hasFileAccess = false;
      let hasFileSend = false;
      let hasTerminalAccess = false;
      try {
        const peerPerms = await dropzone.api.getPeerPermissions(p.pairingId);
        if (peerPerms.success && peerPerms.data) {
          const fileReadPerm = peerPerms.data.find((perm: any) => perm.permissionType === 'file_access_read');
          if (fileReadPerm) hasFileAccess = fileReadPerm.granted;
          
          const fileReceivePerm = peerPerms.data.find((perm: any) => perm.permissionType === 'file_receive');
          if (fileReceivePerm) hasFileSend = fileReceivePerm.granted;
          
          const terminalPerm = peerPerms.data.find((perm: any) => perm.permissionType === 'terminal_access');
          if (terminalPerm) hasTerminalAccess = terminalPerm.granted;
        }
      } catch (err) {
        // ignore
      }

      devices.push({
        pairingId: p.pairingId,
        deviceCode: peerCode,
        deviceName: info.data.deviceName,
        deviceType: info.data.deviceType,
        platform: info.data.platform,
        isOnline: false,
        lastSeen: Date.now(),
        connectionMode: 'remote',
        hasFileAccess,
        hasFileSend,
        hasTerminalAccess,
      });
    }
  }
  store.setPairedDevices(devices);
  syncTrayPermissions().catch(console.error);
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

/** UI permission groups mapped to underlying permission types */
const TRAY_PERMISSION_GROUPS = [
  { label: 'Clipboard Sync', types: ['clipboard_read', 'clipboard_write'] },
  { label: 'File Sharing', types: ['file_send', 'file_receive'] },
  { label: 'Remote File Browsing', types: ['file_access_read'] },
  { label: 'Remote File Editing', types: ['file_access_write'] },
  { label: 'Remote Terminal', types: ['terminal_access'] },
];

/**
 * Fetch permissions for all paired devices and send them to the main process
 * to build the tray menu permissions dropdown.
 */
export async function syncTrayPermissions(): Promise<void> {
  if (!window.electronAPI?.updateTrayPermissions) return;

  const store = useAppStore.getState();
  const trayData = [];
  
  for (const device of store.pairedDevices) {
    const res = await dropzone.api.getPermissions(device.pairingId);
    if (res.success && res.data) {
      trayData.push({
        pairingId: device.pairingId,
        deviceName: device.deviceName,
        permissions: TRAY_PERMISSION_GROUPS.map(group => {
          // A group is granted if ALL of its underlying types are granted
          const granted = group.types.every(t => res.data!.find(p => p.permissionType === t)?.granted);
          return {
            label: group.label,
            types: group.types,
            granted
          };
        })
      });
    }
  }
  
  window.electronAPI.updateTrayPermissions(trayData);
}
