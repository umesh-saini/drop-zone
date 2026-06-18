import type { ClipboardAdapter, ClipboardChangeEvent } from '@dropzone/shared';

/**
 * Tauri-specific clipboard adapter.
 *
 * Uses Tauri's clipboard plugin for reading/writing.
 * Falls back to polling since Tauri doesn't have native clipboard events.
 *
 * Requires: @tauri-apps/plugin-clipboard-manager
 */
export class TauriClipboardAdapter implements ClipboardAdapter {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastContent: string | null = null;
  private monitoring = false;
  private intervalMs: number;

  constructor(intervalMs: number = 500) {
    this.intervalMs = intervalMs;
  }

  async read(): Promise<string | null> {
    try {
      // Dynamic import to avoid issues when Tauri isn't available
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
      const text = await readText();
      return text || null;
    } catch {
      // Fallback for development outside Tauri
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async write(text: string): Promise<void> {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      this.lastContent = text;
      await writeText(text);
    } catch {
      // Fallback for development outside Tauri
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        this.lastContent = text;
        await navigator.clipboard.writeText(text);
      }
    }
  }

  startMonitoring(onChange: (event: ClipboardChangeEvent) => void): void {
    if (this.monitoring) return;
    this.monitoring = true;

    // Initialize with current content
    this.read().then((content) => {
      this.lastContent = content;
    });

    // Poll for changes (Tauri clipboard plugin doesn't support events natively)
    this.pollInterval = setInterval(async () => {
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
        // Silently ignore polling errors
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
