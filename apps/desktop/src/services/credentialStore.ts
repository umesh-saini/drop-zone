import type { DeviceCredentials } from '@dropzone/shared';

/**
 * Persistent credential storage.
 *
 * Uses localStorage (works in both Electron renderer and browser dev).
 * In Electron, localStorage persists across sessions by default.
 * For extra security in production, could migrate to electron-store with
 * encryption via the main process.
 */

const CREDS_KEY = 'dropzone_credentials';
const SECRETS_KEY = 'dropzone_pairing_secrets';

export async function saveCredentials(creds: DeviceCredentials): Promise<void> {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export async function loadCredentials(): Promise<DeviceCredentials | null> {
  const data = localStorage.getItem(CREDS_KEY);
  return data ? JSON.parse(data) : null;
}

export async function updateToken(token: string): Promise<void> {
  const creds = await loadCredentials();
  if (creds) {
    creds.token = token;
    await saveCredentials(creds);
  }
}

export async function saveSharedSecret(pairingId: string, secret: string): Promise<void> {
  const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
  secrets[pairingId] = secret;
  localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
}

export async function getSharedSecret(pairingId: string): Promise<string | null> {
  const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
  return secrets[pairingId] || null;
}

export async function deleteSharedSecret(pairingId: string): Promise<void> {
  const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
  delete secrets[pairingId];
  localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
}

export async function clearCredentials(): Promise<void> {
  localStorage.removeItem(CREDS_KEY);
  localStorage.removeItem(SECRETS_KEY);
}
