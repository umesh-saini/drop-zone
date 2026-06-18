import { ClipboardSyncService } from './ClipboardSyncService';
import type { ClipboardAdapter, ClipboardSyncOptions, ClipboardEntry } from './types';

/**
 * Options for the encrypted clipboard sync
 */
export interface EncryptedClipboardSyncOptions extends ClipboardSyncOptions {
  /** Device code of this device */
  deviceCode: string;
  /** Encrypt function: (plaintext, pairingId) => encrypted string */
  encryptFn: (plaintext: string, pairingId: string) => Promise<string>;
  /** Decrypt function: (ciphertext, pairingId) => plaintext */
  decryptFn: (ciphertext: string, pairingId: string) => Promise<string>;
  /** Send encrypted content to server/socket */
  sendFn: (encryptedContent: string, timestamp: number) => void;
  /** Active pairing IDs this device syncs with */
  pairingIds: string[];
}

/**
 * EncryptedClipboardSync wraps ClipboardSyncService with E2E encryption.
 *
 * Flow (outgoing):
 *   1. Local clipboard changes
 *   2. ClipboardSyncService debounces and calls sendFn
 *   3. Content is encrypted per-pairing before sending
 *   4. Encrypted payload sent via WebSocket to server
 *
 * Flow (incoming):
 *   1. Receive encrypted payload from server
 *   2. Decrypt using pairing's shared secret
 *   3. Pass to ClipboardSyncService.handleRemoteClipboard()
 *   4. Service applies conflict resolution and updates local clipboard
 */
export class EncryptedClipboardSync {
  private syncService: ClipboardSyncService;
  private options: EncryptedClipboardSyncOptions;
  private started = false;

  constructor(adapter: ClipboardAdapter, options: EncryptedClipboardSyncOptions) {
    this.options = options;
    this.syncService = new ClipboardSyncService(adapter, {
      debounceMs: options.debounceMs,
      maxSize: options.maxSize,
      pollIntervalMs: options.pollIntervalMs,
      autoSync: options.autoSync,
    });
  }

  /**
   * Start encrypted clipboard sync.
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.syncService.start(async (content, timestamp) => {
      // Encrypt content for each pairing and send
      for (const pairingId of this.options.pairingIds) {
        try {
          const encrypted = await this.options.encryptFn(content, pairingId);
          this.options.sendFn(encrypted, timestamp);
        } catch (error) {
          console.error(`Failed to encrypt clipboard for pairing ${pairingId}:`, error);
        }
      }
    });
  }

  /**
   * Stop encrypted clipboard sync.
   */
  stop(): void {
    this.syncService.stop();
    this.started = false;
  }

  /**
   * Handle incoming encrypted clipboard from a paired device.
   */
  async handleIncoming(
    encryptedContent: string,
    timestamp: number,
    fromDevice: string,
    pairingId: string
  ): Promise<void> {
    try {
      const plaintext = await this.options.decryptFn(encryptedContent, pairingId);
      await this.syncService.handleRemoteClipboard(plaintext, timestamp, fromDevice);
    } catch (error) {
      console.error(`Failed to decrypt clipboard from ${fromDevice}:`, error);
    }
  }

  /**
   * Update active pairings (e.g., when a new device pairs/unpairs).
   */
  updatePairings(pairingIds: string[]): void {
    this.options.pairingIds = pairingIds;
  }

  /**
   * Get sync state.
   */
  getState() {
    return this.syncService.getState();
  }

  /**
   * Get clipboard history.
   */
  getHistory(): ClipboardEntry[] {
    return this.syncService.getHistory();
  }

  /**
   * Clear history.
   */
  clearHistory(): void {
    this.syncService.clearHistory();
  }

  /**
   * Whether sync is currently running.
   */
  isRunning(): boolean {
    return this.started;
  }
}
