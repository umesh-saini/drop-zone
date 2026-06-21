import type { ClipboardAdapter, ClipboardChangeEvent } from '@dropzone/shared';

/**
 * Electron clipboard adapter.
 *
 * Uses Electron's clipboard API via the preload bridge (window.electronAPI).
 * Falls back to navigator.clipboard for plain browser dev mode.
 *
 * Electron's clipboard.readText() works regardless of window focus — true
 * global clipboard capture. Polls every 500ms.
 */
export class TauriClipboardAdapter implements ClipboardAdapter {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastContent: string | null = null;
  private monitoring = false;
  private intervalMs: number;
  private onChange: ((event: ClipboardChangeEvent) => void) | null = null;
  private focusHandler: (() => void) | null = null;

  constructor(intervalMs: number = 500) {
    this.intervalMs = intervalMs;
  }

  private get isElectron(): boolean {
    return !!window.electronAPI;
  }

  async read(): Promise<string | null> {
    if (this.isElectron) {
      try {
        const text = await window.electronAPI!.clipboardRead();
        return text || null;
      } catch {
        return null;
      }
    }
    // Browser fallback (requires focus)
    try {
      if (document.hasFocus() && navigator.clipboard) {
        return await navigator.clipboard.readText();
      }
    } catch {
      // not focused or permission denied
    }
    return null;
  }

  async write(text: string): Promise<void> {
    this.lastContent = text; // Prevent echo
    if (this.isElectron) {
      try {
        await window.electronAPI!.clipboardWrite(text);
        return;
      } catch {
        // fall through
      }
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // silently fail
    }
  }

  startMonitoring(onChange: (event: ClipboardChangeEvent) => void): void {
    if (this.monitoring) return;
    this.monitoring = true;
    this.onChange = onChange;

    // Initialize
    this.read().then((c) => {
      this.lastContent = c;
    });

    // Poll continuously — works in Electron regardless of focus
    this.pollInterval = setInterval(() => this.poll(), this.intervalMs);

    // Browser fallback: also check on focus + copy events
    if (!this.isElectron) {
      this.focusHandler = () => setTimeout(() => this.poll(), 100);
      window.addEventListener('focus', this.focusHandler);
      document.addEventListener('copy', () => setTimeout(() => this.poll(), 100));
    }
  }

  private async poll(): Promise<void> {
    try {
      const current = await this.read();
      if (current !== null && current !== this.lastContent) {
        this.lastContent = current;
        this.onChange?.({ content: current, timestamp: Date.now() });
      }
    } catch {
      // silently ignore
    }
  }

  stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
    this.monitoring = false;
    this.onChange = null;
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }
}
