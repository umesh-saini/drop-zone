import * as SecureStore from 'expo-secure-store';

/**
 * Credential + secret persistence.
 *
 * Uses expo-secure-store (encrypted keystore, included in Expo Go).
 * Falls back to in-memory storage if the native module is unavailable
 * (e.g. unsupported environment) so the app never crashes on init.
 */

export interface DeviceCredentials {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  token: string;
  secretToken: string;
  publicKey: string;
  secretKey: string;
}

const CREDS_KEY = 'dropzone_credentials';
const SECRETS_KEY = 'dropzone_secrets';

// In-memory fallback
const memory = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memory.set(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v !== null) return v;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

export async function saveCredentials(creds: DeviceCredentials): Promise<void> {
  await setItem(CREDS_KEY, JSON.stringify(creds));
}

export async function loadCredentials(): Promise<DeviceCredentials | null> {
  const data = await getItem(CREDS_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveSharedSecret(pairingId: string, secret: string): Promise<void> {
  const raw = await getItem(SECRETS_KEY);
  const secrets = raw ? JSON.parse(raw) : {};
  secrets[pairingId] = secret;
  await setItem(SECRETS_KEY, JSON.stringify(secrets));
}

export async function getSharedSecret(pairingId: string): Promise<string | null> {
  const raw = await getItem(SECRETS_KEY);
  const secrets = raw ? JSON.parse(raw) : {};
  return secrets[pairingId] || null;
}
