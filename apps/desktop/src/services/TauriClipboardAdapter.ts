import type { ClipboardAdapter, ClipboardChangeEvent } from '@dropzone/shared';

/**
 * Tauri-specific clipboard adapter.
 *
 * In Tauri (production): uses @tauri-apps/plugin-clipboard-manager which
 * reads the system clipboard regardless of window focus.
 *
 * In browser dev mode: uses navigator.clipboard with a focus listener +
 * polling when focused. navigator.clipboard.readText() requires focus.
 */
export class TauriClipboardAdapter implements ClipboardAdapter {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastContent: string | null = null;
  private monitoring = false;
  private intervalMs: number;
  private isTauri: boolean;
  private onChange: ((event: ClipboardChangeEvent) => void) | null = null;
  private focusHandler: (() => void) | null = null;

  constructor(intervalMs: number = 500) {
    this.intervalMs = intervalMs;
    // Detect if we're running inside Tauri
    this.isTauri = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
  }

  async read(): Promise<string | null> {
    if (this.isTauri) {
      try {
        const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
        const text = await readText();
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
      // Permission denied or not focused
    }
    return null;
  }

  async write(text: string): Promise<void> {
    this.lastContent = text; // Prevent echo
    if (this.isTauri) {
      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(text);
        return;
      } catch {
        // fall through
      }
    }
    // Browser fallback
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

    // Initialize with current content
    this.read().then((content) => {
      this.lastContent = content;
    });

    // Poll continuously (works in Tauri regardless of focus)
    this.pollInterval = setInterval(() => this.poll(), this.intervalMs);

    // In browser dev: also check on window focus (since polling only works when focused)
    if (!this.isTauri) {
      this.focusHandler = () => {
        // Short delay so the clipboard has time to update
        setTimeout(() => this.poll(), 100);
      };
      window.addEventListener('focus', this.focusHandler);
      // Also check on copy events in this window
      document.addEventListener('copy', () => {
        setTimeout(() => this.poll(), 100);
      });
    }
  }

  private async poll(): Promise<void> {
    try {
      const current = await this.read();
      if (current !== null && current !== this.lastContent) {
        this.lastContent = current;
        this.onChange?.({
          content: current,
          timestamp: Date.now(),
        });
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
