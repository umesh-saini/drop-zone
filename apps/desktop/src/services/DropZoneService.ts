import { io, Socket } from 'socket.io-client';
import {
  ApiClient,
  RealtimeClient,
  ClipboardSyncService,
  TransferManager,
  type DeviceCredentials,
  type PairingInfo,
  type TransferProgress,
} from '@dropzone/shared';
import {
  generateKeyPair,
  deriveSharedSecret,
  encryptClipboard,
  decryptClipboard,
} from '@dropzone/crypto';
import { config, detectPlatform } from '@/lib/config';
import { TauriClipboardAdapter } from './TauriClipboardAdapter';
import { TauriFileAdapter } from './TauriFileAdapter';
import * as credStore from './credentialStore';

/**
 * DropZoneService is the central orchestrator for the desktop app.
 * Wires together: API client, realtime socket, crypto, clipboard sync.
 */
export class DropZoneService {
  api: ApiClient;
  private socket: Socket | null = null;
  private realtime: RealtimeClient | null = null;
  private clipboardSync: ClipboardSyncService | null = null;
  private transferManager: TransferManager | null = null;
  private fileAdapter: TauriFileAdapter | null = null;
  private credentials: DeviceCredentials | null = null;
  private pairings: PairingInfo[] = [];
  // pairingId -> peer deviceCode
  private pairingPeers = new Map<string, string>();

  // Event callbacks for the UI
  callbacks: {
    onConnectionChange?: (connected: boolean) => void;
    onClipboardReceived?: (content: string, fromDevice: string) => void;
    onDeviceStatusChange?: (deviceCode: string, online: boolean) => void;
    onPairingRequest?: (fromDevice: string) => void;
    onPairingAccepted?: () => void;
    onClipboardSent?: (content: string) => void;
    onTransferProgress?: (progress: TransferProgress) => void;
    onFileOffer?: (offer: {
      fileId: string;
      fileName: string;
      fileSize: number;
      fromDevice: string;
    }) => void;
  } = {};

  constructor() {
    this.api = new ApiClient(config.serverUrl);
    this.api.onTokenRotation((newToken) => {
      credStore.updateToken(newToken);
    });
  }

  /**
   * Initialize: load existing credentials or register a new device.
   * If the cached device no longer exists on the server (e.g. DB was reset),
   * it automatically re-registers a fresh device.
   */
  async initialize(deviceName?: string): Promise<DeviceCredentials> {
    let creds = await credStore.loadCredentials();
    let valid = false;

    if (creds) {
      // Existing device — try to re-authenticate
      this.api.setToken(creds.token);
      const me = await this.api.getMe();
      if (me.success) {
        valid = true;
      } else {
        // Token expired/invalid — try re-login with the secret token
        const login = await this.api.login(creds.deviceCode, creds.secretToken);
        if (login.success && login.data) {
          creds.token = login.data.token;
          this.api.setToken(creds.token);
          await credStore.saveCredentials(creds);
          valid = true;
        }
      }
    }

    if (!valid) {
      // No creds, or the cached device no longer exists on the server
      // (e.g. server DB was reset) — register a fresh device.
      const existingKeys = creds; // reuse keypair if we have one, else generate
      const keyPair =
        existingKeys?.publicKey && existingKeys?.secretKey
          ? { publicKey: existingKeys.publicKey, secretKey: existingKeys.secretKey }
          : generateKeyPair();
      const name = deviceName || creds?.deviceName || `Desktop ${Math.floor(Math.random() * 1000)}`;
      const res = await this.api.register({
        deviceName: name,
        deviceType: 'desktop',
        platform: detectPlatform(),
        publicKey: keyPair.publicKey,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Registration failed');
      }

      creds = {
        deviceCode: res.data.deviceCode,
        deviceName: res.data.deviceName,
        deviceType: 'desktop',
        platform: detectPlatform(),
        token: res.data.token,
        secretToken: res.data.secretToken,
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
      };

      this.api.setToken(creds.token);
      await credStore.saveCredentials(creds);
    }

    this.credentials = creds!;
    return creds!;
  }

  /**
   * Reconnect: re-run initialization + socket connection.
   * Used by the manual "Reconnect" button and on demand.
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.initialize();
    await this.connect();
  }

  /**
   * Connect to the server via WebSocket.
   */
  async connect(): Promise<void> {
    if (!this.credentials) throw new Error('Not initialized');

    this.socket = io(config.wsUrl, {
      auth: { token: this.credentials.token },
      transports: ['websocket'],
      reconnection: true,
    });

    this.realtime = new RealtimeClient(this.socket);
    this.realtime.start({
      onConnect: () => this.callbacks.onConnectionChange?.(true),
      onDisconnect: () => this.callbacks.onConnectionChange?.(false),
      onDeviceOnline: (code) => this.callbacks.onDeviceStatusChange?.(code, true),
      onDeviceOffline: (code) => this.callbacks.onDeviceStatusChange?.(code, false),
      onClipboardUpdate: (data) => this.handleIncomingClipboard(data),
      onPairingRequest: (data) => this.callbacks.onPairingRequest?.(data.fromDevice),
      onPairingAccepted: () => this.callbacks.onPairingAccepted?.(),
      onFileOffer: (data) => {
        this.transferManager?.handleOffer(
          { ...data, toDevice: this.credentials!.deviceCode, totalChunks: 0, chunkSize: 0 } as any,
          this.findPairingForPeer(data.fromDevice) || ''
        );
        this.callbacks.onFileOffer?.(data);
      },
      onFileAccept: (data) => this.transferManager?.startSending(data.fileId),
      onFileChunk: (data) =>
        this.transferManager?.handleChunk({
          fileId: data.fileId,
          chunkIndex: data.chunkIndex,
          totalChunks: data.totalChunks,
          data: data.data,
          size: data.data.length,
        }),
      onFileComplete: (data) => this.transferManager?.handleComplete(data.fileId),
      onError: (data) => console.error('[Socket] Error:', data.message),
    });

    this.realtime.connect();

    // Setup file transfer manager
    this.fileAdapter = new TauriFileAdapter();
    this.transferManager = new TransferManager(this.fileAdapter, {
      onProgress: (p) => this.callbacks.onTransferProgress?.(p),
      onCompleted: (fileId) => {
        const p = this.transferManager?.getProgress(fileId);
        if (p) this.callbacks.onTransferProgress?.({ ...p, status: 'completed', progress: 100 });
      },
      onFailed: (fileId, error) => console.error(`Transfer ${fileId} failed:`, error),
    });
    this.transferManager.setSendFunctions({
      sendChunk: (chunk, toDevice) => this.realtime?.sendFileChunk({ ...chunk, toDevice }),
      sendOffer: (offer) =>
        this.realtime?.offerFile({
          toDevice: offer.toDevice,
          fileName: offer.fileName,
          fileSize: offer.fileSize,
          fileType: offer.fileType,
        }),
      sendComplete: (fileId, toDevice) => this.realtime?.completeFile(fileId, toDevice),
    });

    // Load pairings
    await this.refreshPairings();

    // Start clipboard sync
    this.startClipboardSync();
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    this.clipboardSync?.stop();
    this.realtime?.disconnect();
    this.socket = null;
  }

  /**
   * Refresh the list of pairings and resolve shared secrets.
   */
  async refreshPairings(): Promise<PairingInfo[]> {
    const res = await this.api.getPairings();
    if (res.success && res.data) {
      this.pairings = res.data.filter((p) => p.status === 'active');
      // Map pairingId -> peer device code
      for (const p of this.pairings) {
        const peer = p.deviceACode === this.credentials!.deviceCode ? p.deviceBCode : p.deviceACode;
        this.pairingPeers.set(p.pairingId, peer);
        await this.ensureSharedSecret(p, peer);
      }
    }
    return this.pairings;
  }

  /**
   * Ensure we have a derived shared secret stored for a pairing.
   */
  private async ensureSharedSecret(pairing: PairingInfo, peerCode: string): Promise<void> {
    const existing = await credStore.getSharedSecret(pairing.pairingId);
    if (existing) return;

    // Fetch peer's public key and derive the shared secret
    const peer = await this.api.lookupDevice(peerCode);
    if (peer.success && peer.data?.publicKey) {
      const secret = deriveSharedSecret(this.credentials!.secretKey, peer.data.publicKey);
      await credStore.saveSharedSecret(pairing.pairingId, secret);
    }
  }

  /**
   * Start monitoring local clipboard and syncing to paired devices.
   */
  private startClipboardSync(): void {
    const adapter = new TauriClipboardAdapter(config.localDiscoveryPort ? 800 : 800);
    this.clipboardSync = new ClipboardSyncService(adapter, { debounceMs: 400 });

    this.clipboardSync.start(async (content, _timestamp) => {
      // Encrypt and send to every paired device
      for (const pairing of this.pairings) {
        const secret = await credStore.getSharedSecret(pairing.pairingId);
        if (!secret) continue;
        const encrypted = await encryptClipboard(content, secret);
        this.realtime?.syncClipboard(JSON.stringify(encrypted), Date.now());
      }
      this.callbacks.onClipboardSent?.(content);
    });
  }

  /**
   * Handle an incoming encrypted clipboard update.
   */
  private async handleIncomingClipboard(data: {
    content: string;
    fromDevice: string;
    timestamp: number;
    pairingId: string;
  }): Promise<void> {
    const secret = await credStore.getSharedSecret(data.pairingId);
    if (!secret) return;

    try {
      const payload = JSON.parse(data.content);
      const plaintext = await decryptClipboard(payload, secret);
      await this.clipboardSync?.handleRemoteClipboard(plaintext, data.timestamp, data.fromDevice);
      this.callbacks.onClipboardReceived?.(plaintext, data.fromDevice);
    } catch (err) {
      console.error('[Clipboard] Failed to decrypt:', err);
    }
  }

  // --- File transfer ---

  /**
   * Pick a file and send it to a paired device.
   */
  async sendFile(toDeviceCode: string): Promise<void> {
    if (!this.fileAdapter || !this.transferManager) throw new Error('Not connected');
    const files = await this.fileAdapter.pickFiles({ multiple: false });
    if (files.length === 0) return;

    const pairingId = this.findPairingForPeer(toDeviceCode);
    if (!pairingId) throw new Error('No active pairing with that device');

    await this.transferManager.sendFile(
      files[0],
      toDeviceCode,
      this.credentials!.deviceCode,
      pairingId
    );
  }

  /**
   * Accept an incoming file offer.
   */
  async acceptFileOffer(fileId: string, fromDevice: string): Promise<void> {
    await this.transferManager?.acceptTransfer(fileId);
    this.realtime?.acceptFile(fileId, fromDevice);
  }

  private findPairingForPeer(peerCode: string): string | undefined {
    for (const [pairingId, peer] of this.pairingPeers) {
      if (peer === peerCode) return pairingId;
    }
    return undefined;
  }

  // --- Pairing ---

  async pairWithDevice(targetCode: string): Promise<PairingInfo> {
    const res = await this.api.requestPairing(targetCode);
    if (!res.success || !res.data) throw new Error(res.error || 'Pairing failed');
    // Also notify the target in real time (server already emits, this is a backup
    // for cases where the HTTP emit path and socket differ)
    this.realtime?.notifyPairingRequest(targetCode);
    return res.data;
  }

  async acceptPairing(pairingId: string): Promise<void> {
    const res = await this.api.acceptPairing(pairingId);
    if (!res.success) throw new Error(res.error || 'Accept failed');
    await this.refreshPairings();
  }

  async rejectPairing(pairingId: string): Promise<void> {
    const res = await this.api.rejectPairing(pairingId);
    if (!res.success) throw new Error(res.error || 'Reject failed');
  }

  /**
   * Get pending incoming pairing requests (where this device is NOT the initiator).
   */
  async getPendingIncoming(): Promise<{ pairingId: string; fromDeviceCode: string }[]> {
    const res = await this.api.getPendingPairings();
    if (!res.success || !res.data) return [];
    return res.data
      .filter((p) => p.initiatedBy !== this.credentials!.deviceCode)
      .map((p) => ({ pairingId: p.pairingId, fromDeviceCode: p.initiatedBy }));
  }

  getCredentials(): DeviceCredentials | null {
    return this.credentials;
  }

  getPairings(): PairingInfo[] {
    return this.pairings;
  }

  getPeerForPairing(pairingId: string): string | undefined {
    return this.pairingPeers.get(pairingId);
  }
}

// Singleton instance
export const dropzone = new DropZoneService();
