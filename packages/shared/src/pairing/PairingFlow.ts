import type { PairingFlowState, PairingFlowEvent, PeerDeviceInfo, PairingMethod } from './types';
import type { QRPairingData } from './types';
import { generateQRData, encodeQRData, decodeQRData, isQRExpired } from './qr';
import { createPairingPIN, isPINExpired, type PairingPIN } from './pin';

/**
 * PairingFlow manages the state machine for device pairing.
 *
 * Handles both QR and PIN flows with a unified state machine.
 * Platform-agnostic — UI subscribes to state changes.
 */
export class PairingFlow {
  private state: PairingFlowState = 'idle';
  private method: PairingMethod | null = null;
  private qrData: QRPairingData | null = null;
  private pinData: PairingPIN | null = null;
  private peerDevice: PeerDeviceInfo | null = null;
  private pairingId: string | null = null;
  private error: string | null = null;
  private onStateChange: ((event: PairingFlowEvent) => void) | null = null;

  // Device info
  private deviceCode: string;
  private publicKey: string;
  private deviceName: string;
  private deviceType: 'desktop' | 'mobile' | 'web';

  // External functions
  private sendPairingRequestFn: ((targetCode: string) => Promise<string>) | null = null;
  private acceptPairingFn: ((pairingId: string) => Promise<void>) | null = null;
  private rejectPairingFn: ((pairingId: string) => Promise<void>) | null = null;
  private registerPINFn: ((pin: PairingPIN) => Promise<void>) | null = null;
  private verifyPINFn: ((pin: string) => Promise<PeerDeviceInfo | null>) | null = null;

  constructor(
    deviceCode: string,
    publicKey: string,
    deviceName: string,
    deviceType: 'desktop' | 'mobile' | 'web'
  ) {
    this.deviceCode = deviceCode;
    this.publicKey = publicKey;
    this.deviceName = deviceName;
    this.deviceType = deviceType;
  }

  /**
   * Subscribe to state changes.
   */
  onStateChanged(callback: (event: PairingFlowEvent) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Set external API functions.
   */
  setApiFunctions(fns: {
    sendPairingRequest: (targetCode: string) => Promise<string>;
    acceptPairing: (pairingId: string) => Promise<void>;
    rejectPairing: (pairingId: string) => Promise<void>;
    registerPIN?: (pin: PairingPIN) => Promise<void>;
    verifyPIN?: (pin: string) => Promise<PeerDeviceInfo | null>;
  }): void {
    this.sendPairingRequestFn = fns.sendPairingRequest;
    this.acceptPairingFn = fns.acceptPairing;
    this.rejectPairingFn = fns.rejectPairing;
    this.registerPINFn = fns.registerPIN || null;
    this.verifyPINFn = fns.verifyPIN || null;
  }

  /**
   * Start showing QR code / PIN for another device to pair with us.
   */
  startShowingCode(method: PairingMethod = 'qr'): { qrString?: string; pin?: PairingPIN } {
    this.method = method;
    this.setState('showing_code');

    if (method === 'qr') {
      this.qrData = generateQRData(
        this.deviceCode,
        this.publicKey,
        this.deviceName,
        this.deviceType
      );
      const qrString = encodeQRData(this.qrData);
      return { qrString };
    } else {
      this.pinData = createPairingPIN(this.deviceCode, this.publicKey);
      // Register PIN on server for verification
      this.registerPINFn?.(this.pinData);
      return { pin: this.pinData };
    }
  }

  /**
   * Handle scanned QR data from camera.
   * Called when this device scans another device's QR code.
   */
  async handleScannedQR(qrString: string): Promise<boolean> {
    this.method = 'qr';
    this.setState('scanning');

    const data = decodeQRData(qrString);
    if (!data) {
      this.setError('Invalid QR code');
      return false;
    }

    if (isQRExpired(data)) {
      this.setError('QR code has expired');
      return false;
    }

    if (data.code === this.deviceCode) {
      this.setError('Cannot pair with yourself');
      return false;
    }

    this.peerDevice = {
      deviceCode: data.code,
      deviceName: data.name,
      deviceType: data.type,
      publicKey: data.publicKey,
    };

    this.setState('confirming');
    return true;
  }

  /**
   * Handle manually entered PIN.
   * Verifies PIN with server and retrieves peer device info.
   */
  async handlePINEntry(pin: string): Promise<boolean> {
    this.method = 'pin';
    this.setState('scanning');

    if (!this.verifyPINFn) {
      this.setError('PIN verification not available');
      return false;
    }

    const peer = await this.verifyPINFn(pin);
    if (!peer) {
      this.setError('Invalid or expired PIN');
      return false;
    }

    if (peer.deviceCode === this.deviceCode) {
      this.setError('Cannot pair with yourself');
      return false;
    }

    this.peerDevice = peer;
    this.setState('confirming');
    return true;
  }

  /**
   * User confirms pairing after seeing peer device info.
   */
  async confirmPairing(): Promise<boolean> {
    if (!this.peerDevice || !this.sendPairingRequestFn) {
      this.setError('No peer device or API not configured');
      return false;
    }

    this.setState('requesting');

    try {
      this.pairingId = await this.sendPairingRequestFn(this.peerDevice.deviceCode);
      this.setState('waiting_approval');
      return true;
    } catch (error: any) {
      this.setError(error.message || 'Pairing request failed');
      return false;
    }
  }

  /**
   * Handle incoming pairing request from another device.
   * Called when we receive a pairing request notification.
   */
  handleIncomingRequest(pairingId: string, peerDevice: PeerDeviceInfo): void {
    this.pairingId = pairingId;
    this.peerDevice = peerDevice;
    this.setState('confirming');
  }

  /**
   * Accept an incoming pairing request.
   */
  async acceptIncoming(): Promise<boolean> {
    if (!this.pairingId || !this.acceptPairingFn) {
      this.setError('No pairing to accept');
      return false;
    }

    this.setState('key_exchange');

    try {
      await this.acceptPairingFn(this.pairingId);
      this.setState('completed');
      return true;
    } catch (error: any) {
      this.setError(error.message || 'Failed to accept pairing');
      return false;
    }
  }

  /**
   * Reject an incoming pairing request.
   */
  async rejectIncoming(): Promise<void> {
    if (!this.pairingId || !this.rejectPairingFn) return;

    try {
      await this.rejectPairingFn(this.pairingId);
    } catch {
      // Silently ignore
    }

    this.reset();
  }

  /**
   * Handle approval from the other device (we initiated the request).
   */
  handleApproval(): void {
    this.setState('key_exchange');
    // Key exchange happens automatically after pairing is accepted
    // (shared secret derived from exchanged public keys)
    this.setState('completed');
  }

  /**
   * Handle rejection from the other device.
   */
  handleRejection(): void {
    this.setError('Pairing request was rejected');
  }

  /**
   * Reset the pairing flow to idle.
   */
  reset(): void {
    this.state = 'idle';
    this.method = null;
    this.qrData = null;
    this.pinData = null;
    this.peerDevice = null;
    this.pairingId = null;
    this.error = null;
    this.emitState();
  }

  /**
   * Get current state.
   */
  getState(): PairingFlowState {
    return this.state;
  }

  /**
   * Get peer device info.
   */
  getPeerDevice(): PeerDeviceInfo | null {
    return this.peerDevice;
  }

  /**
   * Get pairing ID.
   */
  getPairingId(): string | null {
    return this.pairingId;
  }

  /**
   * Get error message.
   */
  getError(): string | null {
    return this.error;
  }

  private setState(state: PairingFlowState): void {
    this.state = state;
    this.error = null;
    this.emitState();
  }

  private setError(error: string): void {
    this.error = error;
    this.state = 'failed';
    this.emitState();
  }

  private emitState(): void {
    this.onStateChange?.({
      state: this.state,
      error: this.error || undefined,
      pairingId: this.pairingId || undefined,
      peerDevice: this.peerDevice || undefined,
    });
  }
}
