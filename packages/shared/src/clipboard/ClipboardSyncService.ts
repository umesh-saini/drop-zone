import type {
  ClipboardAdapter,
  ClipboardEntry,
  ClipboardSyncOptions,
  ClipboardSyncState,
} from './types';

/**
 * ClipboardSyncService manages clipboard synchronization between paired devices.
 *
 * Platform-agnostic: relies on a ClipboardAdapter for platform-specific clipboard access
 * and callback functions for network communication.
 *
 * Features:
 * - Debounced change detection (avoids flooding on rapid changes)
 * - Conflict resolution (latest timestamp wins)
 * - Prevents echo loops (ignores remote updates that we just sent)
 * - History tracking
 * - Max size enforcement
 */
export class ClipboardSyncService {
  private adapter: ClipboardAdapter;
  private options: Required<ClipboardSyncOptions>;
  private state: ClipboardSyncState;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSentContent: string | null = null;
  private lastSentTimestamp: number = 0;
  private onSendCallback: ((content: string, timestamp: number) => void) | null = null;
  private maxHistorySize = 50;

  constructor(adapter: ClipboardAdapter, options: ClipboardSyncOptions = {}) {
    this.adapter = adapter;
    this.options = {
      debounceMs: options.debounceMs ?? 300,
      maxSize: options.maxSize ?? 10 * 1024 * 1024, // 10MB
      pollIntervalMs: options.pollIntervalMs ?? 500,
      autoSync: options.autoSync ?? true,
    };
    this.state = {
      isConnected: false,
      isSyncing: false,
      lastSyncTimestamp: null,
      lastContent: null,
      history: [],
    };
  }

  /**
   * Start clipboard sync.
   * @param onSend - Called when local clipboard changes and should be sent to paired devices
   */
  start(onSend: (content: string, timestamp: number) => void): void {
    this.onSendCallback = onSend;
    this.state.isConnected = true;
    this.state.isSyncing = true;

    if (this.options.autoSync) {
      this.adapter.startMonitoring((event) => {
        this.handleLocalChange(event.content, event.timestamp);
      });
    }
  }

  /**
   * Stop clipboard sync.
   */
  stop(): void {
    this.adapter.stopMonitoring();
    this.state.isSyncing = false;
    this.state.isConnected = false;
    this.onSendCallback = null;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Handle a local clipboard change.
   * Debounces rapid changes and sends to paired devices.
   */
  private handleLocalChange(content: string, timestamp: number): void {
    // Skip if content exceeds max size
    if (content.length > this.options.maxSize) {
      return;
    }

    // Skip if same as last sent (prevent echo from our own remote write)
    if (content === this.lastSentContent) {
      return;
    }

    // Skip empty content
    if (!content || content.trim().length === 0) {
      return;
    }

    // Debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sendClipboard(content, timestamp);
    }, this.options.debounceMs);
  }

  /**
   * Send clipboard content to paired devices.
   */
  private sendClipboard(content: string, timestamp: number): void {
    if (!this.onSendCallback || !this.state.isSyncing) return;

    this.lastSentContent = content;
    this.lastSentTimestamp = timestamp;
    this.state.lastContent = content;
    this.state.lastSyncTimestamp = timestamp;

    // Add to history
    this.addToHistory({
      content,
      timestamp,
      source: 'local',
    });

    this.onSendCallback(content, timestamp);
  }

  /**
   * Handle receiving clipboard content from a paired device.
   * Applies conflict resolution (latest timestamp wins).
   */
  async handleRemoteClipboard(
    content: string,
    timestamp: number,
    fromDevice: string
  ): Promise<void> {
    // Skip if content exceeds max size
    if (content.length > this.options.maxSize) {
      return;
    }

    // Conflict resolution: if we just sent something in the last 2 seconds,
    // don't overwrite our clipboard with a remote update (prevents echo loops).
    // Use 2s window instead of strict timestamp comparison to handle clock drift.
    if (this.lastSentTimestamp > 0 && Date.now() - this.lastSentTimestamp < 2000) {
      return;
    }

    // Skip if same content (no-op)
    if (content === this.state.lastContent) {
      return;
    }

    // Update local clipboard
    this.lastSentContent = content; // Prevent echo
    await this.adapter.write(content);

    this.state.lastContent = content;
    this.state.lastSyncTimestamp = timestamp;

    // Add to history
    this.addToHistory({
      content,
      timestamp,
      source: 'remote',
      fromDevice,
    });
  }

  /**
   * Manually trigger a clipboard send (for non-auto-sync mode).
   */
  async sendCurrent(): Promise<void> {
    const content = await this.adapter.read();
    if (content) {
      this.sendClipboard(content, Date.now());
    }
  }

  /**
   * Get current sync state.
   */
  getState(): ClipboardSyncState {
    return { ...this.state };
  }

  /**
   * Get clipboard history.
   */
  getHistory(): ClipboardEntry[] {
    return [...this.state.history];
  }

  /**
   * Clear clipboard history.
   */
  clearHistory(): void {
    this.state.history = [];
  }

  private addToHistory(entry: ClipboardEntry): void {
    this.state.history.unshift(entry);
    if (this.state.history.length > this.maxHistorySize) {
      this.state.history = this.state.history.slice(0, this.maxHistorySize);
    }
  }
}
