import type { ConnectionMode } from './types';

/**
 * ConnectionRouter decides whether to send messages via local or remote.
 *
 * It provides a unified "send" interface that automatically routes messages
 * to the fastest available path:
 * - Local: direct WebSocket to peer device (LAN speed)
 * - Remote: via relay server (internet speed, E2E encrypted)
 *
 * Seamless fallback:
 * - If local connection drops → automatically switches to remote
 * - If local becomes available → upgrades from remote to local
 */
export class ConnectionRouter {
  private localSendFn: ((deviceCode: string, event: string, data: any) => boolean) | null = null;
  private remoteSendFn: ((event: string, data: any) => void) | null = null;
  private connectionModes = new Map<string, ConnectionMode>();
  private preferLocal: boolean;

  constructor(preferLocal: boolean = true) {
    this.preferLocal = preferLocal;
  }

  /**
   * Set the function for sending via local WebSocket.
   * Should return true if message was sent successfully.
   */
  setLocalSend(fn: (deviceCode: string, event: string, data: any) => boolean): void {
    this.localSendFn = fn;
  }

  /**
   * Set the function for sending via remote relay (Socket.io to server).
   */
  setRemoteSend(fn: (event: string, data: any) => void): void {
    this.remoteSendFn = fn;
  }

  /**
   * Send a message to a specific device.
   * Automatically routes via local or remote based on current mode.
   */
  send(deviceCode: string, event: string, data: any): boolean {
    const mode = this.getMode(deviceCode);

    if (mode === 'local' && this.localSendFn) {
      const sent = this.localSendFn(deviceCode, event, data);
      if (sent) return true;
      // Local failed → fall back to remote
    }

    // Send via remote relay
    if (this.remoteSendFn) {
      this.remoteSendFn(event, { ...data, toDevice: deviceCode });
      return true;
    }

    return false;
  }

  /**
   * Broadcast a message to all paired devices.
   * Routes each message via the best path per device.
   */
  broadcast(deviceCodes: string[], event: string, data: any): void {
    for (const code of deviceCodes) {
      this.send(code, event, data);
    }
  }

  /**
   * Set connection mode for a device.
   */
  setMode(deviceCode: string, mode: ConnectionMode): void {
    this.connectionModes.set(deviceCode, mode);
  }

  /**
   * Get connection mode for a device.
   */
  getMode(deviceCode: string): ConnectionMode {
    if (!this.preferLocal) return 'remote';
    return this.connectionModes.get(deviceCode) || 'remote';
  }

  /**
   * Upgrade a device to local mode.
   */
  upgradeToLocal(deviceCode: string): void {
    this.connectionModes.set(deviceCode, 'local');
  }

  /**
   * Downgrade a device to remote mode (local connection lost).
   */
  downgradeToRemote(deviceCode: string): void {
    this.connectionModes.set(deviceCode, 'remote');
  }

  /**
   * Get all device connection modes.
   */
  getAllModes(): Map<string, ConnectionMode> {
    return new Map(this.connectionModes);
  }

  /**
   * Get summary stats.
   */
  getStats(): { local: number; remote: number; total: number } {
    let local = 0;
    let remote = 0;
    for (const mode of this.connectionModes.values()) {
      if (mode === 'local') local++;
      else if (mode === 'remote') remote++;
    }
    return { local, remote, total: local + remote };
  }
}
