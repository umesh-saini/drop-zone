import { config } from '../lib/config';

/**
 * Mobile API client (fetch-based) for the DropZone server.
 */

interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${config.serverUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.error || `Request failed (${res.status})` };
    return json as ApiResult<T>;
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

export const api = {
  setToken,
  health: () =>
    fetch(`${config.serverUrl}/health`)
      .then((r) => r.ok)
      .catch(() => false),
  register: (data: {
    deviceName: string;
    deviceType: string;
    platform: string;
    publicKey: string;
  }) => request('POST', '/api/devices/register', data),
  login: (deviceCode: string, secretToken: string) =>
    request('POST', '/api/devices/login', { deviceCode, secretToken }),
  getMe: () => request('GET', '/api/devices/me'),
  updateMe: (updates: { deviceName?: string; publicKey?: string; fcmToken?: string }) =>
    request('PATCH', '/api/devices/me', updates),
  lookupDevice: (code: string) => request('GET', `/api/devices/${code}`),
  requestPairing: (targetDeviceCode: string) =>
    request('POST', '/api/pairings/request', { targetDeviceCode }),
  acceptPairing: (pairingId: string) => request('POST', `/api/pairings/${pairingId}/accept`),
  getPairings: () => request('GET', '/api/pairings'),
  getPendingPairings: () => request('GET', '/api/pairings/pending'),
  rejectPairing: (pairingId: string) => request('POST', `/api/pairings/${pairingId}/reject`),
  revokePairing: (pairingId: string) => request('POST', `/api/pairings/${pairingId}/revoke`),
  getPermissions: (pairingId: string) => request('GET', `/api/pairings/${pairingId}/permissions`),
  updatePermission: (pairingId: string, permissionType: string, granted: boolean) =>
    request('PUT', `/api/pairings/${pairingId}/permissions`, {
      permissionType,
      granted,
    }),
  verifyPIN: (pin: string) => request('POST', '/api/pairing/pin/verify', { pin }),
};
