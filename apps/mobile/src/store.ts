import { create } from 'zustand';

export interface PairedDevice {
  pairingId: string;
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  online: boolean;
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

interface State {
  initializing: boolean;
  connected: boolean;
  deviceCode: string | null;
  deviceName: string | null;
  devices: PairedDevice[];
  clips: ClipItem[];
  pendingRequests: PendingRequest[];
  setInitializing: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setDevice: (code: string, name: string) => void;
  setDevices: (d: PairedDevice[]) => void;
  setDeviceOnline: (code: string, online: boolean) => void;
  addClip: (c: ClipItem) => void;
  setPendingRequests: (r: PendingRequest[]) => void;
}

export const useStore = create<State>((set) => ({
  initializing: true,
  connected: false,
  deviceCode: null,
  deviceName: null,
  devices: [],
  clips: [],
  pendingRequests: [],
  setInitializing: (v) => set({ initializing: v }),
  setConnected: (v) => set({ connected: v }),
  setDevice: (code, name) => set({ deviceCode: code, deviceName: name }),
  setDevices: (d) => set({ devices: d }),
  setDeviceOnline: (code, online) =>
    set((s) => ({ devices: s.devices.map((d) => (d.deviceCode === code ? { ...d, online } : d)) })),
  addClip: (c) => set((s) => ({ clips: [c, ...s.clips].slice(0, 50) })),
  setPendingRequests: (r) => set({ pendingRequests: r }),
}));
