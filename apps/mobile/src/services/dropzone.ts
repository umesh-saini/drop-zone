import { io, Socket } from 'socket.io-client';
import { config } from '../lib/config';
import { api } from './api';
import { generateKeyPair, deriveSharedSecret, encrypt, decrypt } from './crypto';
import * as storage from './storage';
import type { DeviceCredentials } from './storage';
import { FileTransfer, type TransferProgress } from './fileTransfer';
import * as FileSystem from 'expo-file-system';
import { handleRemoteRequest } from './remoteFileHost';

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

  /** Public API client for direct calls from UI */
  get api() {
    return api;
  }
  private pairings: PairingInfo[] = [];
  private permissionsCache = new Map<string, Record<string, boolean>>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private fileTransfer = new FileTransfer();

  callbacks: {
    onConnectionChange?: (connected: boolean) => void;
    onClipboardReceived?: (content: string, fromDevice: string) => void;
    onDeviceStatusChange?: (deviceCode: string, online: boolean) => void;
    onPairingRequest?: (fromDevice: string) => void;
    onPairingAccepted?: () => void;
    onPairingRevoked?: (pairingId: string) => void;
    onPermissionUpdate?: (pairingId: string) => void;
    onTransferProgress?: (p: TransferProgress) => void;
    onFileSaved?: (fileName: string) => void;
    onClipboardSent?: (content: string) => void;
  } = {};

  async initialize(): Promise<DeviceCredentials> {
    let creds = await storage.loadCredentials();
    let valid = false;

    if (creds) {
      api.setToken(creds.token);
      const me = await api.getMe();
      if (me.success) {
        valid = true;
      } else {
        const login = await api.login(creds.deviceCode, creds.secretToken);
        if (login.success && login.data) {
          creds.token = login.data.token;
          api.setToken(creds.token);
          await storage.saveCredentials(creds);
          valid = true;
        }
      }
    }

    if (!valid) {
      // No creds, or the cached device no longer exists on the server
      // (e.g. server DB was reset) — register a fresh device.
      const kp =
        creds?.publicKey && creds?.secretKey
          ? { publicKey: creds.publicKey, secretKey: creds.secretKey }
          : generateKeyPair();
      // Try to get name from onboarding, fall back to random
      let savedName = '';
      try {
        const SecStore = require('expo-secure-store');
        savedName = (await SecStore.getItemAsync('dropzone_device_name')) || '';
      } catch {}
      const res = await api.register({
        deviceName: creds?.deviceName || savedName || `Phone ${Math.floor(Math.random() * 1000)}`,
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

    this.credentials = creds!;
    return creds!;
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await this.initialize();
    await this.connect();
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
    this.socket.on('pairing:revoked', (d: any) => {
      storage.deleteSharedSecret(d.pairingId);
      this.callbacks.onPairingRevoked?.(d.pairingId);
    });
    this.socket.on('permission:update', (d: any) => {
      this.refreshPermissions(d.pairingId);
      this.callbacks.onPermissionUpdate?.(d.pairingId);
    });
    this.socket.on('remote:response', (d: any) => {
      const handler = this.remoteResponseHandlers.get(d.response?.requestId);
      if (handler) handler(d.response);
    });
    // Host: respond to remote file access requests from paired devices
    this.socket.on('remote:request', async (d: any) => {
      // Find the pairing for this device
      const pairing = this.pairings.find(
        (p) => p.deviceACode === d.fromDevice || p.deviceBCode === d.fromDevice
      );

      if (!pairing) return;

      const type = d.request.type;
      const isWrite = type === 'delete' || type === 'rename';
      const requiredPerm = isWrite ? 'file_access_write' : 'file_access_read';

      // Enforce permissions!
      if (!this.hasPermission(pairing.pairingId, requiredPerm)) {
        this.socket?.emit('remote:response', {
          toDevice: d.fromDevice,
          response: {
            requestId: d.request.requestId,
            success: false,
            error: 'Permission denied: ' + requiredPerm,
          },
        });
        return;
      }

      const response = await handleRemoteRequest(d.request);

      if (type === 'download_file' && response.success) {
        try {
          const filePath = response.data.path;
          const info = await FileSystem.getInfoAsync(filePath);
          if (info.exists && !info.isDirectory) {
            const fileName = filePath.split(/[\\/]/).pop() || 'download';
            await this.fileTransfer.sendFromUri(filePath, d.fromDevice, fileName, info.size);
          }
        } catch (err) {
          console.error('[Remote Request] Failed to trigger download:', err);
        }
      }

      this.socket?.emit('remote:response', { toDevice: d.fromDevice, response });
    });

    // Wire file transfer
    this.fileTransfer.attach(this.socket, this.credentials.deviceCode);
    this.fileTransfer.onProgress = (p) => this.callbacks.onTransferProgress?.(p);
    this.fileTransfer.onSaved = (fileName) => this.callbacks.onFileSaved?.(fileName);

    await this.refreshPairings();

    // Auto-capture clipboard when app comes to foreground
    this.startClipboardAutoCapture();
    // Also do an initial check right away in case we just booted up
    this.checkClipboardAndSend();
  }

  private lastClipboard: string | null = null;
  private appStateListener: any = null;

  private async checkClipboardAndSend(): Promise<void> {
    try {
      const Clip = require('expo-clipboard');
      const text = await Clip.getStringAsync();
      if (text && text !== this.lastClipboard && text.length < 10 * 1024 * 1024) {
        this.lastClipboard = text;
        // Auto-send if clipboard_write permission is granted
        await this.sendClipboard(text);
      }
    } catch {
      // Silently ignore
    }
  }

  private startClipboardAutoCapture(): void {
    const { AppState } = require('react-native');
    this.appStateListener = AppState.addEventListener('change', async (state: string) => {
      if (state === 'active') {
        // App just came to foreground — check if clipboard changed
        await this.checkClipboardAndSend();
      }
    });
  }

  private stopClipboardAutoCapture(): void {
    this.appStateListener?.remove?.();
    this.appStateListener = null;
  }

  /**
   * Pick a file and send it to a paired device.
   */
  async sendFile(toDevice: string): Promise<void> {
    await this.fileTransfer.pickAndSend(toDevice);
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopClipboardAutoCapture();
    this.socket?.disconnect();
    this.socket = null;
  }

  async refreshPairings(): Promise<PairingInfo[]> {
    const res = await api.getPairings();
    if (res.success && res.data) {
      this.pairings = res.data.filter((p: PairingInfo) => p.status === 'active');
      for (const p of this.pairings) {
        await this.refreshPermissions(p.pairingId);
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

  async refreshPermissions(pairingId: string): Promise<void> {
    const res = await api.getPermissions(pairingId);
    if (res.success && res.data) {
      const map: Record<string, boolean> = {};
      for (const p of res.data) map[p.permissionType] = p.granted;
      this.permissionsCache.set(pairingId, map);
    }
  }

  hasPermission(pairingId: string, permissionType: string): boolean {
    return this.permissionsCache.get(pairingId)?.[permissionType] ?? false;
  }

  async setPermission(pairingId: string, permissionType: string, granted: boolean): Promise<void> {
    const res = await api.updatePermission(pairingId, permissionType, granted);
    if (!res.success) throw new Error(res.error || 'Update failed');
    await this.refreshPermissions(pairingId);
  }

  getPermissions(pairingId: string): Record<string, boolean> {
    return this.permissionsCache.get(pairingId) ?? {};
  }

  async sendClipboard(content: string): Promise<void> {
    let sent = false;
    for (const p of this.pairings) {
      // Respect permission
      if (!this.hasPermission(p.pairingId, 'clipboard_write')) continue;
      const secret = await storage.getSharedSecret(p.pairingId);
      if (!secret) continue;
      const enc = encrypt(content, secret);
      this.socket?.emit('clipboard:sync', { content: JSON.stringify(enc), timestamp: Date.now() });
      sent = true;
    }
    if (sent) {
      this.lastClipboard = content;
      this.callbacks.onClipboardSent?.(content);
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

      // Auto-copy to system clipboard so the user doesn't have to manually copy it
      try {
        const Clip = require('expo-clipboard');
        await Clip.setStringAsync(plaintext);
        this.lastClipboard = plaintext;
      } catch (e) {}

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

  async unpairDevice(pairingId: string): Promise<void> {
    const res = await api.revokePairing(pairingId);
    if (!res.success) throw new Error(res.error || 'Unpair failed');
    await storage.deleteSharedSecret(pairingId);
    this.pairings = this.pairings.filter((p) => p.pairingId !== pairingId);
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

  /**
   * Send a remote file access request to another device.
   */
  sendRemoteRequest(toDevice: string, request: any): void {
    this.socket?.emit('remote:request', { toDevice, request });
  }

  /**
   * Pending remote response handlers (request-reply pattern).
   */
  private remoteResponseHandlers = new Map<string, (response: any) => void>();

  /**
   * Send a remote request and wait for a response (promise-based).
   */
  remoteRequest(toDevice: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fullReq = { ...request, requestId };

      const timeout = setTimeout(() => {
        this.remoteResponseHandlers.delete(requestId);
        reject(new Error('Request timed out'));
      }, 10000);

      this.remoteResponseHandlers.set(requestId, (response) => {
        clearTimeout(timeout);
        this.remoteResponseHandlers.delete(requestId);
        resolve(response);
      });

      this.sendRemoteRequest(toDevice, fullReq);
    });
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
