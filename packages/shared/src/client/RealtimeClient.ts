import type { SocketLike } from './types';

/**
 * RealtimeClient wraps a socket.io-client instance (injected) and provides
 * typed methods for DropZone's realtime events.
 *
 * The app creates the socket (with its own socket.io-client version) and
 * passes it in — keeping the shared package decoupled from socket.io versions.
 */

export interface RealtimeHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onDeviceOnline?: (deviceCode: string) => void;
  onDeviceOffline?: (deviceCode: string) => void;
  onClipboardUpdate?: (data: {
    content: string;
    fromDevice: string;
    timestamp: number;
    pairingId: string;
  }) => void;
  onFileOffer?: (data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fromDevice: string;
    timestamp: number;
    totalChunks: number;
    chunkSize: number;
  }) => void;
  onFileAccept?: (data: { fileId: string; acceptedBy: string }) => void;
  onFileReject?: (data: { fileId: string; rejectedBy: string }) => void;
  onFileChunk?: (data: {
    fileId: string;
    chunkIndex: number;
    totalChunks: number;
    data: string;
    fromDevice: string;
  }) => void;
  onFileComplete?: (data: { fileId: string; fromDevice: string }) => void;
  onPairingRequest?: (data: { pairingId?: string; fromDevice: string; timestamp: number }) => void;
  onPairingAccepted?: (data: { pairingId: string; acceptedBy: string }) => void;
  onPairingRevoked?: (data: { pairingId: string; revokedBy: string }) => void;
  onPermissionUpdate?: (data: { pairingId: string; updatedBy: string }) => void;
  onRemoteRequest?: (data: { fromDevice: string; request: any }) => void;
  onRemoteResponse?: (data: { fromDevice: string; response: any }) => void;
  onError?: (data: { message: string }) => void;
}

export class RealtimeClient {
  private socket: SocketLike;
  private handlers: RealtimeHandlers = {};
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(socket: SocketLike) {
    this.socket = socket;
  }

  /**
   * Bind event handlers and start listening.
   */
  start(handlers: RealtimeHandlers): void {
    this.handlers = handlers;

    this.socket.on('connect', () => {
      this.handlers.onConnect?.();
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.stopHeartbeat();
      this.handlers.onDisconnect?.(reason);
    });

    this.socket.on('device:online', (data: { deviceCode: string }) =>
      this.handlers.onDeviceOnline?.(data.deviceCode)
    );
    this.socket.on('device:offline', (data: { deviceCode: string }) =>
      this.handlers.onDeviceOffline?.(data.deviceCode)
    );

    this.socket.on('clipboard:update', (data: any) => this.handlers.onClipboardUpdate?.(data));

    this.socket.on('file:offer', (data: any) => this.handlers.onFileOffer?.(data));
    this.socket.on('file:accept', (data: any) => this.handlers.onFileAccept?.(data));
    this.socket.on('file:reject', (data: any) => this.handlers.onFileReject?.(data));
    this.socket.on('file:chunk', (data: any) => this.handlers.onFileChunk?.(data));
    this.socket.on('file:complete', (data: any) => this.handlers.onFileComplete?.(data));

    this.socket.on('pairing:request', (data: any) => this.handlers.onPairingRequest?.(data));
    this.socket.on('pairing:accepted', (data: any) => this.handlers.onPairingAccepted?.(data));
    this.socket.on('pairing:revoked', (data: any) => this.handlers.onPairingRevoked?.(data));
    this.socket.on('permission:update', (data: any) => this.handlers.onPermissionUpdate?.(data));

    this.socket.on('remote:request', (data: any) => this.handlers.onRemoteRequest?.(data));
    this.socket.on('remote:response', (data: any) => this.handlers.onRemoteResponse?.(data));

    this.socket.on('error', (data: any) => this.handlers.onError?.(data));
  }

  // --- Emit methods ---

  syncClipboard(content: string, timestamp: number): void {
    this.socket.emit('clipboard:sync', { content, timestamp });
  }

  offerFile(data: {
    fileId: string;
    toDevice: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    totalChunks: number;
    chunkSize: number;
  }): void {
    this.socket.emit('file:offer', data);
  }

  acceptFile(fileId: string, fromDevice: string): void {
    this.socket.emit('file:accept', { fileId, fromDevice });
  }

  rejectFile(fileId: string, fromDevice: string): void {
    this.socket.emit('file:reject', { fileId, fromDevice });
  }

  sendFileChunk(data: {
    fileId: string;
    toDevice: string;
    chunkIndex: number;
    totalChunks: number;
    data: string;
  }): void {
    this.socket.emit('file:chunk', data);
  }

  completeFile(fileId: string, toDevice: string): void {
    this.socket.emit('file:complete', { fileId, toDevice });
  }

  notifyPairingRequest(targetDeviceCode: string): void {
    this.socket.emit('pairing:request', { targetDeviceCode });
  }

  sendRemoteRequest(toDevice: string, request: any): void {
    this.socket.emit('remote:request', { toDevice, request });
  }

  sendRemoteResponse(toDevice: string, response: any): void {
    this.socket.emit('remote:response', { toDevice, response });
  }

  // --- Connection ---

  connect(): void {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.socket.disconnect();
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.socket.emit('heartbeat');
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
