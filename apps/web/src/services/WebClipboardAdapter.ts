import type { ClipboardAdapter, ClipboardChangeEvent } from '@dropzone/shared';

/**
 * Web browser clipboard adapter.
 *
 * Uses the Clipboard API (navigator.clipboard).
 * Note: Clipboard read requires user focus/permission in most browsers.
 *
 * Web limitation: No native clipboard change event exists.
 * Uses focus-based polling — checks clipboard when tab gains focus.
 */
export class WebClipboardAdapter implements ClipboardAdapter {
  private lastContent: string | null = null;
  private monitoring = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private focusHandler: (() => void) | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = 1000) {
    this.intervalMs = intervalMs;
  }

  async read(): Promise<string | null> {
    try {
      if (!navigator.clipboard) return null;
      const text = await navigator.clipboard.readText();
      return text || null;
    } catch {
      // Permission denied or not focused
      return null;
    }
  }

  async write(text: string): Promise<void> {
    try {
      if (!navigator.clipboard) return;
      this.lastContent = text;
      await navigator.clipboard.writeText(text);
    } catch {
      // Permission denied
    }
  }

  startMonitoring(onChange: (event: ClipboardChangeEvent) => void): void {
    if (this.monitoring) return;
    this.monitoring = true;

    // Check clipboard on tab focus (when user copies from another app)
    this.focusHandler = async () => {
      try {
        const current = await this.read();
        if (current !== null && current !== this.lastContent) {
          this.lastContent = current;
          onChange({
            content: current,
            timestamp: Date.now(),
          });
        }
      } catch {
        // Permission denied
      }
    };

    window.addEventListener('focus', this.focusHandler);

    // Also poll at intervals (for when tab stays focused)
    this.pollInterval = setInterval(async () => {
      if (!document.hasFocus()) return; // Only read when focused
      try {
        const current = await this.read();
        if (current !== null && current !== this.lastContent) {
          this.lastContent = current;
          onChange({
            content: current,
            timestamp: Date.now(),
          });
        }
      } catch {
        // Permission denied or not focused
      }
    }, this.intervalMs);
  }

  stopMonitoring(): void {
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
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
