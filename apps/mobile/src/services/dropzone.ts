import { io, Socket } from 'socket.io-client';
import { config } from '../lib/config';
import { api } from './api';
import { generateKeyPair, deriveSharedSecret, encrypt, decrypt } from './crypto';
import * as storage from './storage';
import type { DeviceCredentials } from './storage';

export interface PairingInfo {
  pairingId: string;
  deviceACode: string;
  deviceBCode: string;
  initiatedBy: string;
  status: string;
}

/**
 * Mobile DropZone orchestrator: registration, socket, pairing, clipboard E2E.
 */
class MobileDropZone {
  private socket: Socket | null = null;
  private credentials: DeviceCredentials | null = null;
  private pairings: PairingInfo[] = [];
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  callbacks: {
    onConnectionChange?: (connected: boolean) => void;
    onClipboardReceived?: (content: string, fromDevice: string) => void;
    onDeviceStatusChange?: (deviceCode: string, online: boolean) => void;
    onPairingRequest?: (fromDevice: string) => void;
    onPairingAccepted?: () => void;
  } = {};

  async initialize(): Promise<DeviceCredentials> {
    let creds = await storage.loadCredentials();

    if (creds) {
      api.setToken(creds.token);
      const me = await api.getMe();
      if (!me.success) {
        const login = await api.login(creds.deviceCode, creds.secretToken);
        if (login.success && login.data) {
          creds.token = login.data.token;
          api.setToken(creds.token);
          await storage.saveCredentials(creds);
        }
      }
    } else {
      const kp = generateKeyPair();
      const res = await api.register({
        deviceName: `Phone ${Math.floor(Math.random() * 1000)}`,
        deviceType: 'mobile',
        platform: 'android',
        publicKey: kp.publicKey,
      });
      if (!res.success || !res.data) throw new Error(res.error || 'Registration failed');
      creds = {
        deviceCode: res.data.deviceCode,
        deviceName: res.data.deviceName,
        deviceType: 'mobile',
        platform: 'android',
        token: res.data.token,
        secretToken: res.data.secretToken,
        publicKey: kp.publicKey,
        secretKey: kp.secretKey,
      };
      api.setToken(creds.token);
      await storage.saveCredentials(creds);
    }

    this.credentials = creds;
    return creds;
  }

  async connect(): Promise<void> {
    if (!this.credentials) throw new Error('Not initialized');

    this.socket = io(config.wsUrl, {
      auth: { token: this.credentials.token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.callbacks.onConnectionChange?.(true);
      this.startHeartbeat();
    });
    this.socket.on('disconnect', () => {
      this.callbacks.onConnectionChange?.(false);
      this.stopHeartbeat();
    });
    this.socket.on('device:online', (d: any) =>
      this.callbacks.onDeviceStatusChange?.(d.deviceCode, true)
    );
    this.socket.on('device:offline', (d: any) =>
      this.callbacks.onDeviceStatusChange?.(d.deviceCode, false)
    );
    this.socket.on('clipboard:update', (d: any) => this.handleClipboard(d));
    this.socket.on('pairing:request', (d: any) => this.callbacks.onPairingRequest?.(d.fromDevice));
    this.socket.on('pairing:accepted', () => this.callbacks.onPairingAccepted?.());

    await this.refreshPairings();
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }

  async refreshPairings(): Promise<PairingInfo[]> {
    const res = await api.getPairings();
    if (res.success && res.data) {
      this.pairings = res.data.filter((p: PairingInfo) => p.status === 'active');
      for (const p of this.pairings) {
        if (await storage.getSharedSecret(p.pairingId)) continue;
        const peer = p.deviceACode === this.credentials!.deviceCode ? p.deviceBCode : p.deviceACode;
        const info = await api.lookupDevice(peer);
        if (info.success && info.data?.publicKey) {
          await storage.saveSharedSecret(
            p.pairingId,
            deriveSharedSecret(this.credentials!.secretKey, info.data.publicKey)
          );
        }
      }
    }
    return this.pairings;
  }

  async sendClipboard(content: string): Promise<void> {
    for (const p of this.pairings) {
      const secret = await storage.getSharedSecret(p.pairingId);
      if (!secret) continue;
      const enc = encrypt(content, secret);
      this.socket?.emit('clipboard:sync', { content: JSON.stringify(enc), timestamp: Date.now() });
    }
  }

  private async handleClipboard(data: {
    content: string;
    fromDevice: string;
    pairingId: string;
  }): Promise<void> {
    const secret = await storage.getSharedSecret(data.pairingId);
    if (!secret) return;
    try {
      const plaintext = decrypt(JSON.parse(data.content), secret);
      this.callbacks.onClipboardReceived?.(plaintext, data.fromDevice);
    } catch (e) {
      console.error('Decrypt failed', e);
    }
  }

  async pairWithDevice(targetCode: string): Promise<PairingInfo> {
    const res = await api.requestPairing(targetCode);
    if (!res.success || !res.data) throw new Error(res.error || 'Pairing failed');
    this.socket?.emit('pairing:request', { targetDeviceCode: targetCode });
    return res.data;
  }

  async acceptPairing(pairingId: string): Promise<void> {
    const res = await api.acceptPairing(pairingId);
    if (!res.success) throw new Error(res.error || 'Accept failed');
    await this.refreshPairings();
  }

  async rejectPairing(pairingId: string): Promise<void> {
    const res = await api.rejectPairing(pairingId);
    if (!res.success) throw new Error(res.error || 'Reject failed');
  }

  async getPendingIncoming(): Promise<{ pairingId: string; fromDeviceCode: string }[]> {
    const res = await api.getPendingPairings();
    if (!res.success || !res.data) return [];
    return res.data
      .filter((p: PairingInfo) => p.initiatedBy !== this.credentials!.deviceCode)
      .map((p: PairingInfo) => ({ pairingId: p.pairingId, fromDeviceCode: p.initiatedBy }));
  }

  getCredentials(): DeviceCredentials | null {
    return this.credentials;
  }

  getPairings(): PairingInfo[] {
    return this.pairings;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => this.socket?.emit('heartbeat'), 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }
}

export const dropzone = new MobileDropZone();
