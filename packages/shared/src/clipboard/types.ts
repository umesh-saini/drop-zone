/**
 * Clipboard-related types shared across all platforms
 */

/** Clipboard content entry */
export interface ClipboardEntry {
  content: string;
  timestamp: number; // unix ms
  source: 'local' | 'remote';
  fromDevice?: string; // device code if remote
}

/** Clipboard change event */
export interface ClipboardChangeEvent {
  content: string;
  timestamp: number;
}

/** Platform clipboard adapter interface */
export interface ClipboardAdapter {
  /** Read current clipboard text */
  read(): Promise<string | null>;
  /** Write text to clipboard */
  write(text: string): Promise<void>;
  /** Start monitoring clipboard changes (calls onChange when content changes) */
  startMonitoring(onChange: (event: ClipboardChangeEvent) => void): void;
  /** Stop monitoring */
  stopMonitoring(): void;
  /** Whether monitoring is currently active */
  isMonitoring(): boolean;
}

/** Clipboard sync options */
export interface ClipboardSyncOptions {
  /** Debounce interval in ms (default: 300) */
  debounceMs?: number;
  /** Maximum clipboard content size in bytes (default: 10MB) */
  maxSize?: number;
  /** Polling interval for clipboard monitoring in ms (default: 500) */
  pollIntervalMs?: number;
  /** Whether to sync automatically on clipboard change (default: true) */
  autoSync?: boolean;
}

/** Clipboard sync state */
export interface ClipboardSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number | null;
  lastContent: string | null;
  history: ClipboardEntry[];
}
