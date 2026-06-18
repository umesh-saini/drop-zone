import { useEffect, useRef } from 'react';
import { dropzone, type PairingInfo } from '../services/dropzone';
import { api } from '../services/api';
import { useStore, type PairedDevice } from '../store';

/**
 * Initializes the mobile DropZone service and wires events into the store.
 */
export function useDropZone() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const store = useStore.getState();

    async function init() {
      try {
        store.setInitializing(true);
        const creds = await dropzone.initialize();
        store.setDevice(creds.deviceCode, creds.deviceName);

        dropzone.callbacks = {
          onConnectionChange: (c) => store.setConnected(c),
          onDeviceStatusChange: (code, online) => store.setDeviceOnline(code, online),
          onClipboardReceived: (content, from) =>
            store.addClip({ id: `${Date.now()}`, content, from, time: Date.now() }),
        };

        await dropzone.connect();
        await loadDevices(creds.deviceCode);
      } catch (e) {
        console.error('Init failed', e);
      } finally {
        store.setInitializing(false);
      }
    }

    init();
    return () => dropzone.disconnect();
  }, []);
}

export async function loadDevices(myCode: string): Promise<void> {
  const store = useStore.getState();
  const pairings = await dropzone.refreshPairings();
  const devices: PairedDevice[] = [];
  for (const p of pairings as PairingInfo[]) {
    const peer = p.deviceACode === myCode ? p.deviceBCode : p.deviceACode;
    const info = await api.lookupDevice(peer);
    if (info.success && info.data) {
      devices.push({
        pairingId: p.pairingId,
        deviceCode: peer,
        deviceName: info.data.deviceName,
        deviceType: info.data.deviceType,
        online: false,
      });
    }
  }
  store.setDevices(devices);
}
