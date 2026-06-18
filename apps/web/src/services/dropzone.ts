'use client';

import { io, Socket } from 'socket.io-client';
import {
  ApiClient,
  RealtimeClient,
  type DeviceCredentials,
  type PairingInfo,
} from '@dropzone/shared';
import {
  generateKeyPair,
  deriveSharedSecret,
  encryptClipboard,
  decryptClipboard,
} from '@dropzone/crypto';
import { config } from '@/lib/config';

const CREDS_KEY = 'dropzone_web_credentials';
const SECRETS_KEY = 'dropzone_web_secrets';

/**
 * Browser-based DropZone service for the web app.
 * Credentials stored in localStorage (web context).
 */
export class WebDropZoneService {
  api: ApiClient;
  private socket: Socket | null = null;
  private realtime: RealtimeClient | null = null;
  private credentials: DeviceCredentials | null = null;
  private pairings: PairingInfo[] = [];

  callbacks: {
    onConnectionChange?: (connected: boolean) => void;
    onClipboardReceived?: (content: string, fromDevice: string) => void;
    onDeviceStatusChange?: (deviceCode: string, online: boolean) => void;
  } = {};

  constructor() {
    this.api = new ApiClient(config.serverUrl);
    this.api.onTokenRotation((t) => this.updateToken(t));
  }

  private loadCreds(): DeviceCredentials | null {
    if (typeof localStorage === 'undefined') return null;
    const data = localStorage.getItem(CREDS_KEY);
    return data ? JSON.parse(data) : null;
  }

  private saveCreds(creds: DeviceCredentials): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  }

  private updateToken(token: string): void {
    if (this.credentials) {
      this.credentials.token = token;
      this.saveCreds(this.credentials);
    }
  }

  private getSecret(pairingId: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
    return secrets[pairingId] || null;
  }

  private saveSecret(pairingId: string, secret: string): void {
    if (typeof localStorage === 'undefined') return;
    const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
    secrets[pairingId] = secret;
    localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
  }

  async initialize(): Promise<DeviceCredentials> {
    let creds = this.loadCreds();

    if (creds) {
      this.api.setToken(creds.token);
      const me = await this.api.getMe();
      if (!me.success) {
        const login = await this.api.login(creds.deviceCode, creds.secretToken);
        if (login.success && login.data) {
          creds.token = login.data.token;
          this.api.setToken(creds.token);
          this.saveCreds(creds);
        }
      }
    } else {
      const keyPair = generateKeyPair();
      const res = await this.api.register({
        deviceName: `Web ${Math.floor(Math.random() * 1000)}`,
        deviceType: 'web',
        platform: 'web',
        publicKey: keyPair.publicKey,
      });
      if (!res.success || !res.data) throw new Error(res.error || 'Registration failed');

      creds = {
        deviceCode: res.data.deviceCode,
        deviceName: res.data.deviceName,
        deviceType: 'web',
        platform: 'web',
        token: res.data.token,
        secretToken: res.data.secretToken,
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
      };
      this.api.setToken(creds.token);
      this.saveCreds(creds);
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

    this.realtime = new RealtimeClient(this.socket);
    this.realtime.start({
      onConnect: () => this.callbacks.onConnectionChange?.(true),
      onDisconnect: () => this.callbacks.onConnectionChange?.(false),
      onDeviceOnline: (c) => this.callbacks.onDeviceStatusChange?.(c, true),
      onDeviceOffline: (c) => this.callbacks.onDeviceStatusChange?.(c, false),
      onClipboardUpdate: (data) => this.handleIncomingClipboard(data),
    });
    this.realtime.connect();

    await this.refreshPairings();
  }

  disconnect(): void {
    this.realtime?.disconnect();
    this.socket = null;
  }

  async refreshPairings(): Promise<PairingInfo[]> {
    const res = await this.api.getPairings();
    if (res.success && res.data) {
      this.pairings = res.data.filter((p) => p.status === 'active');
      for (const p of this.pairings) {
        if (this.getSecret(p.pairingId)) continue;
        const peer = p.deviceACode === this.credentials!.deviceCode ? p.deviceBCode : p.deviceACode;
        const info = await this.api.lookupDevice(peer);
        if (info.success && info.data?.publicKey) {
          this.saveSecret(
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
      const secret = this.getSecret(p.pairingId);
      if (!secret) continue;
      const encrypted = await encryptClipboard(content, secret);
      this.realtime?.syncClipboard(JSON.stringify(encrypted), Date.now());
    }
  }

  private async handleIncomingClipboard(data: {
    content: string;
    fromDevice: string;
    pairingId: string;
  }): Promise<void> {
    const secret = this.getSecret(data.pairingId);
    if (!secret) return;
    try {
      const plaintext = await decryptClipboard(JSON.parse(data.content), secret);
      this.callbacks.onClipboardReceived?.(plaintext, data.fromDevice);
    } catch (err) {
      console.error('Decrypt failed:', err);
    }
  }

  async pairWithDevice(targetCode: string): Promise<PairingInfo> {
    const res = await this.api.requestPairing(targetCode);
    if (!res.success || !res.data) throw new Error(res.error || 'Pairing failed');
    return res.data;
  }

  getCredentials(): DeviceCredentials | null {
    return this.credentials;
  }

  getPairings(): PairingInfo[] {
    return this.pairings;
  }
}

let instance: WebDropZoneService | null = null;
export function getDropZone(): WebDropZoneService {
  if (!instance) instance = new WebDropZoneService();
  return instance;
}
