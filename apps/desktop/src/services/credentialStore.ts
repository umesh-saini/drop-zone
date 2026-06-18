import type { DeviceCredentials } from '@dropzone/shared';

/**
 * Persistent credential storage for the desktop app.
 * Uses Tauri's store plugin when available, falls back to localStorage in dev.
 */

const STORE_FILE = 'dropzone-credentials.json';
const CREDS_KEY = 'device_credentials';
const SECRETS_KEY = 'pairing_secrets'; // pairingId -> sharedSecret

let tauriStore: any = null;

async function getTauriStore(): Promise<any> {
  if (tauriStore) return tauriStore;
  try {
    const { load } = await import('@tauri-apps/plugin-store');
    tauriStore = await load(STORE_FILE, { autoSave: true, defaults: {} } as any);
    return tauriStore;
  } catch {
    return null;
  }
}

export async function saveCredentials(creds: DeviceCredentials): Promise<void> {
  const store = await getTauriStore();
  if (store) {
    await store.set(CREDS_KEY, creds);
    await store.save();
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  }
}

export async function loadCredentials(): Promise<DeviceCredentials | null> {
  const store = await getTauriStore();
  if (store) {
    const creds = await store.get(CREDS_KEY);
    return (creds as DeviceCredentials) || null;
  } else if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(CREDS_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
}

export async function updateToken(token: string): Promise<void> {
  const creds = await loadCredentials();
  if (creds) {
    creds.token = token;
    await saveCredentials(creds);
  }
}

export async function saveSharedSecret(pairingId: string, secret: string): Promise<void> {
  const store = await getTauriStore();
  if (store) {
    const secrets = ((await store.get(SECRETS_KEY)) as Record<string, string>) || {};
    secrets[pairingId] = secret;
    await store.set(SECRETS_KEY, secrets);
    await store.save();
  } else if (typeof localStorage !== 'undefined') {
    const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
    secrets[pairingId] = secret;
    localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
  }
}

export async function getSharedSecret(pairingId: string): Promise<string | null> {
  const store = await getTauriStore();
  if (store) {
    const secrets = ((await store.get(SECRETS_KEY)) as Record<string, string>) || {};
    return secrets[pairingId] || null;
  } else if (typeof localStorage !== 'undefined') {
    const secrets = JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}');
    return secrets[pairingId] || null;
  }
  return null;
}

export async function clearCredentials(): Promise<void> {
  const store = await getTauriStore();
  if (store) {
    await store.clear();
    await store.save();
  } else if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CREDS_KEY);
    localStorage.removeItem(SECRETS_KEY);
  }
}
