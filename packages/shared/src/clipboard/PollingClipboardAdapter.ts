import type { ClipboardAdapter, ClipboardChangeEvent } from './types';

/**
 * Polling-based clipboard adapter.
 *
 * This is a generic adapter that works by polling the clipboard at intervals.
 * Used as a base for platforms where event-based clipboard monitoring isn't available.
 *
 * Platform-specific read/write must be provided via constructor.
 */
export class PollingClipboardAdapter implements ClipboardAdapter {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastContent: string | null = null;
  private monitoring = false;
  private intervalMs: number;
  private readFn: () => Promise<string | null>;
  private writeFn: (text: string) => Promise<void>;

  constructor(
    readFn: () => Promise<string | null>,
    writeFn: (text: string) => Promise<void>,
    intervalMs: number = 500
  ) {
    this.readFn = readFn;
    this.writeFn = writeFn;
    this.intervalMs = intervalMs;
  }

  async read(): Promise<string | null> {
    return this.readFn();
  }

  async write(text: string): Promise<void> {
    this.lastContent = text; // Prevent self-trigger
    await this.writeFn(text);
  }

  startMonitoring(onChange: (event: ClipboardChangeEvent) => void): void {
    if (this.monitoring) return;
    this.monitoring = true;

    // Initialize with current content
    this.readFn().then((content) => {
      this.lastContent = content;
    });

    this.pollInterval = setInterval(async () => {
      try {
        const current = await this.readFn();

        if (current !== null && current !== this.lastContent) {
          this.lastContent = current;
          onChange({
            content: current,
            timestamp: Date.now(),
          });
        }
      } catch {
        // Silently ignore read errors during polling
      }
    }, this.intervalMs);
  }

  stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.monitoring = false;
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }
}
