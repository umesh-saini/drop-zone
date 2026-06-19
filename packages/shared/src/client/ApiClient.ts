import type {
  ApiResponse,
  RegisterResponse,
  LoginResponse,
  DeviceInfo,
  PairingInfo,
  PermissionInfo,
} from './types';

/**
 * ApiClient — fetch-based HTTP client for the DropZone server.
 *
 * Framework-agnostic, works in Node, browsers, and React Native.
 * Handles auth tokens and automatic token rotation (X-New-Token header).
 */
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onTokenRotated: ((newToken: string) => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  /** Called when the server rotates the token (returns new token via header) */
  onTokenRotation(callback: (newToken: string) => void): void {
    this.onTokenRotated = callback;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      // Handle token rotation
      const newToken = res.headers.get('X-New-Token');
      if (newToken) {
        this.token = newToken;
        this.onTokenRotated?.(newToken);
      }

      const json: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: json.error || `Request failed (${res.status})` };
      }

      return json as ApiResponse<T>;
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  }

  // --- Health ---
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- Device ---
  async register(data: {
    deviceName: string;
    deviceType: string;
    platform: string;
    publicKey: string;
  }): Promise<ApiResponse<RegisterResponse>> {
    return this.request('POST', '/api/devices/register', data);
  }

  async login(deviceCode: string, secretToken: string): Promise<ApiResponse<LoginResponse>> {
    return this.request('POST', '/api/devices/login', { deviceCode, secretToken });
  }

  async getMe(): Promise<ApiResponse<DeviceInfo>> {
    return this.request('GET', '/api/devices/me');
  }

  async updateMe(updates: {
    deviceName?: string;
    publicKey?: string;
  }): Promise<ApiResponse<DeviceInfo>> {
    return this.request('PATCH', '/api/devices/me', updates);
  }

  async lookupDevice(code: string): Promise<ApiResponse<DeviceInfo>> {
    return this.request('GET', `/api/devices/${code}`);
  }

  // --- Pairing ---
  async requestPairing(targetDeviceCode: string): Promise<ApiResponse<PairingInfo>> {
    return this.request('POST', '/api/pairings/request', { targetDeviceCode });
  }

  async acceptPairing(pairingId: string): Promise<ApiResponse<PairingInfo>> {
    return this.request('POST', `/api/pairings/${pairingId}/accept`);
  }

  async rejectPairing(pairingId: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/pairings/${pairingId}/reject`);
  }

  async revokePairing(pairingId: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/pairings/${pairingId}/revoke`);
  }

  async getPairings(): Promise<ApiResponse<PairingInfo[]>> {
    return this.request('GET', '/api/pairings');
  }

  async getPendingPairings(): Promise<ApiResponse<PairingInfo[]>> {
    return this.request('GET', '/api/pairings/pending');
  }

  // --- Permissions ---
  async getPermissions(pairingId: string): Promise<ApiResponse<PermissionInfo[]>> {
    return this.request('GET', `/api/pairings/${pairingId}/permissions`);
  }

  async updatePermission(
    pairingId: string,
    permissionType: string,
    direction: string,
    granted: boolean
  ): Promise<ApiResponse<PermissionInfo>> {
    return this.request('PUT', `/api/pairings/${pairingId}/permissions`, {
      permissionType,
      direction,
      granted,
    });
  }

  // --- PIN pairing ---
  async registerPIN(data: {
    pin: string;
    deviceName: string;
    deviceType: string;
    publicKey: string;
  }): Promise<ApiResponse<{ expiresAt: number }>> {
    return this.request('POST', '/api/pairing/pin/register', data);
  }

  async verifyPIN(pin: string): Promise<ApiResponse<DeviceInfo>> {
    return this.request('POST', '/api/pairing/pin/verify', { pin });
  }
}
