import { create } from 'zustand';

export interface PairedDevice {
  pairingId: string;
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  online: boolean;
  hasFileAccess?: boolean;
  hasFileSend?: boolean;
  hasTerminalAccess?: boolean;
}

export interface ClipItem {
  id: string;
  content: string;
  from: string | null;
  time: number;
}

export interface PendingRequest {
  pairingId: string;
  fromDeviceCode: string;
  fromDeviceName: string;
}

export interface TransferItem {
  fileId: string;
  fileName: string;
  fileSize: number;
  direction: 'send' | 'receive';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  fromDevice?: string;
}

interface State {
  initializing: boolean;
  connected: boolean;
  deviceCode: string | null;
  deviceName: string | null;
  devices: PairedDevice[];
  clips: ClipItem[];
  pendingRequests: PendingRequest[];
  transfers: TransferItem[];
  setInitializing: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setDevice: (code: string, name: string) => void;
  setDevices: (d: PairedDevice[]) => void;
  setDeviceOnline: (code: string, online: boolean) => void;
  addClip: (c: ClipItem) => void;
  clearClips: () => void;
  setPendingRequests: (r: PendingRequest[]) => void;
  upsertTransfer: (t: TransferItem) => void;
  removeTransfer: (fileId: string) => void;
}

export const useStore = create<State>((set) => ({
  initializing: true,
  connected: false,
  deviceCode: null,
  deviceName: null,
  devices: [],
  clips: [],
  pendingRequests: [],
  transfers: [],
  setInitializing: (v) => set({ initializing: v }),
  setConnected: (v) => set({ connected: v }),
  setDevice: (code, name) => set({ deviceCode: code, deviceName: name }),
  setDevices: (d) => set({ devices: d }),
  setDeviceOnline: (code, online) =>
    set((s) => ({ devices: s.devices.map((d) => (d.deviceCode === code ? { ...d, online } : d)) })),
  addClip: (c) => set((s) => ({ clips: [c, ...s.clips].slice(0, 50) })),
  clearClips: () => set({ clips: [] }),
  setPendingRequests: (r) => set({ pendingRequests: r }),
  upsertTransfer: (t) =>
    set((s) => {
      const exists = s.transfers.some((x) => x.fileId === t.fileId);
      return {
        transfers: exists
          ? s.transfers.map((x) => (x.fileId === t.fileId ? { ...x, ...t } : x))
          : [t, ...s.transfers],
      };
    }),
  removeTransfer: (fileId) =>
    set((s) => ({ transfers: s.transfers.filter((x) => x.fileId !== fileId) })),
}));
