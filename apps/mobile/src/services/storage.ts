import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Credential + secret persistence using AsyncStorage.
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

export async function saveCredentials(creds: DeviceCredentials): Promise<void> {
  await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export async function loadCredentials(): Promise<DeviceCredentials | null> {
  const data = await AsyncStorage.getItem(CREDS_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveSharedSecret(pairingId: string, secret: string): Promise<void> {
  const raw = await AsyncStorage.getItem(SECRETS_KEY);
  const secrets = raw ? JSON.parse(raw) : {};
  secrets[pairingId] = secret;
  await AsyncStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
}

export async function getSharedSecret(pairingId: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(SECRETS_KEY);
  const secrets = raw ? JSON.parse(raw) : {};
  return secrets[pairingId] || null;
}
