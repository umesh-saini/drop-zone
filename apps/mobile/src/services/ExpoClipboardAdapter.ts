import type { ClipboardAdapter, ClipboardChangeEvent } from '@dropzone/shared';

/**
 * Expo/React Native clipboard adapter.
 *
 * Uses expo-clipboard for reading/writing.
 * Expo clipboard supports event-based change detection on iOS/Android.
 *
 * Requires: expo-clipboard
 */
export class ExpoClipboardAdapter implements ClipboardAdapter {
  private subscription: any = null;
  private lastContent: string | null = null;
  private monitoring = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = 1000) {
    this.intervalMs = intervalMs;
  }

  async read(): Promise<string | null> {
    try {
      const Clipboard = await import('expo-clipboard');
      const text = await Clipboard.getStringAsync();
      return text || null;
    } catch {
      return null;
    }
  }

  async write(text: string): Promise<void> {
    try {
      const Clipboard = await import('expo-clipboard');
      this.lastContent = text;
      await Clipboard.setStringAsync(text);
    } catch {
      // Silently fail
    }
  }

  startMonitoring(onChange: (event: ClipboardChangeEvent) => void): void {
    if (this.monitoring) return;
    this.monitoring = true;

    // Initialize with current content
    this.read().then((content) => {
      this.lastContent = content;
    });

    // Try to use Expo clipboard event listener (available on iOS 14+ & Android)
    this.setupEventListener(onChange);

    // Fallback: poll on platforms that don't support clipboard events
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
        // Silently ignore
      }
    }, this.intervalMs);
  }

  private async setupEventListener(onChange: (event: ClipboardChangeEvent) => void): Promise<void> {
    try {
      const Clipboard = await import('expo-clipboard');
      if (Clipboard.addClipboardListener) {
        this.subscription = Clipboard.addClipboardListener(
          (event: { contentTypes: string[]; content: string }) => {
            if (event.content && event.content !== this.lastContent) {
              this.lastContent = event.content;
              onChange({
                content: event.content,
                timestamp: Date.now(),
              });
            }
          }
        );
      }
    } catch {
      // Event listener not available, polling handles it
    }
  }

  stopMonitoring(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
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
