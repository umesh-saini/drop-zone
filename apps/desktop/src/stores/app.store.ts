import { create } from 'zustand';

export type AppView = 'devices' | 'clipboard' | 'files' | 'settings';

interface AppState {
  // Navigation
  currentView: AppView;
  setView: (view: AppView) => void;

  // Initialization
  isInitializing: boolean;
  initError: string | null;
  setInitializing: (v: boolean) => void;
  setInitError: (e: string | null) => void;

  // Device info
  deviceCode: string | null;
  deviceName: string | null;
  isRegistered: boolean;
  setDevice: (code: string, name: string) => void;

  // Connection
  isConnected: boolean;
  connectionMode: 'local' | 'remote' | 'disconnected';
  setConnected: (connected: boolean) => void;
  setConnectionMode: (mode: 'local' | 'remote' | 'disconnected') => void;

  // Paired devices
  pairedDevices: PairedDevice[];
  setPairedDevices: (devices: PairedDevice[]) => void;

  // Pending incoming pairing requests
  pendingRequests: PendingRequest[];
  setPendingRequests: (requests: PendingRequest[]) => void;

  // Clipboard
  clipboardHistory: ClipboardItem[];
  addClipboardItem: (item: ClipboardItem) => void;
  clearClipboardHistory: () => void;

  // Transfers
  activeTransfers: TransferItem[];
  addTransfer: (transfer: TransferItem) => void;
  updateTransfer: (fileId: string, updates: Partial<TransferItem>) => void;
  removeTransfer: (fileId: string) => void;
}

export interface PairedDevice {
  pairingId: string;
  deviceCode: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform: string;
  isOnline: boolean;
  lastSeen: number;
  connectionMode: 'local' | 'remote';
}

export interface PendingRequest {
  pairingId: string;
  fromDeviceCode: string;
  fromDeviceName: string;
  fromDeviceType: 'desktop' | 'mobile' | 'web';
}

export interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
  source: 'local' | 'remote';
  fromDevice?: string;
}

export interface TransferItem {
  fileId: string;
  fileName: string;
  fileSize: number;
  direction: 'send' | 'receive';
  status: string;
  progress: number;
  speed: number;
  fromDevice?: string;
  toDevice?: string;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'devices',
  setView: (view) => set({ currentView: view }),

  // Initialization
  isInitializing: true,
  initError: null,
  setInitializing: (v) => set({ isInitializing: v }),
  setInitError: (e) => set({ initError: e }),

  // Device
  deviceCode: null,
  deviceName: null,
  isRegistered: false,
  setDevice: (code, name) => set({ deviceCode: code, deviceName: name, isRegistered: true }),

  // Connection
  isConnected: false,
  connectionMode: 'disconnected',
  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionMode: (mode) => set({ connectionMode: mode }),

  // Paired devices
  pairedDevices: [],
  setPairedDevices: (devices) => set({ pairedDevices: devices }),

  // Pending requests
  pendingRequests: [],
  setPendingRequests: (requests) => set({ pendingRequests: requests }),

  // Clipboard
  clipboardHistory: [],
  addClipboardItem: (item) =>
    set((state) => ({
      clipboardHistory: [item, ...state.clipboardHistory].slice(0, 50),
    })),
  clearClipboardHistory: () => set({ clipboardHistory: [] }),

  // Transfers
  activeTransfers: [],
  addTransfer: (transfer) =>
    set((state) => ({
      activeTransfers: [...state.activeTransfers, transfer],
    })),
  updateTransfer: (fileId, updates) =>
    set((state) => ({
      activeTransfers: state.activeTransfers.map((t) =>
        t.fileId === fileId ? { ...t, ...updates } : t
      ),
    })),
  removeTransfer: (fileId) =>
    set((state) => ({
      activeTransfers: state.activeTransfers.filter((t) => t.fileId !== fileId),
    })),
}));
