import type { KeyPair, KeyStorageAdapter } from './types';

/**
 * In-memory key storage adapter.
 * Used for testing and as a fallback.
 * NOT suitable for production — keys are lost on restart.
 */
export class MemoryKeyStorage implements KeyStorageAdapter {
  private keyPairs = new Map<string, KeyPair>();
  private sharedSecrets = new Map<string, string>();

  async saveKeyPair(deviceCode: string, keyPair: KeyPair): Promise<void> {
    this.keyPairs.set(deviceCode, keyPair);
  }

  async getKeyPair(deviceCode: string): Promise<KeyPair | null> {
    return this.keyPairs.get(deviceCode) || null;
  }

  async saveSharedSecret(pairingId: string, secret: string): Promise<void> {
    this.sharedSecrets.set(pairingId, secret);
  }

  async getSharedSecret(pairingId: string): Promise<string | null> {
    return this.sharedSecrets.get(pairingId) || null;
  }

  async deleteKeyPair(deviceCode: string): Promise<void> {
    this.keyPairs.delete(deviceCode);
  }

  async deleteSharedSecret(pairingId: string): Promise<void> {
    this.sharedSecrets.delete(pairingId);
  }
}

/**
 * LocalStorage-based key storage adapter.
 * Used for Web and Desktop (Tauri) apps in development.
 * In production, desktop should use Tauri's secure storage plugin.
 */
export class LocalStorageKeyStorage implements KeyStorageAdapter {
  private prefix = 'dropzone_';

  async saveKeyPair(deviceCode: string, keyPair: KeyPair): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${this.prefix}keypair_${deviceCode}`, JSON.stringify(keyPair));
  }

  async getKeyPair(deviceCode: string): Promise<KeyPair | null> {
    if (typeof localStorage === 'undefined') return null;
    const data = localStorage.getItem(`${this.prefix}keypair_${deviceCode}`);
    return data ? JSON.parse(data) : null;
  }

  async saveSharedSecret(pairingId: string, secret: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${this.prefix}secret_${pairingId}`, secret);
  }

  async getSharedSecret(pairingId: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(`${this.prefix}secret_${pairingId}`);
  }

  async deleteKeyPair(deviceCode: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${this.prefix}keypair_${deviceCode}`);
  }

  async deleteSharedSecret(pairingId: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${this.prefix}secret_${pairingId}`);
  }
}

/**
 * Platform-specific secure storage notes:
 *
 * Desktop (Tauri):
 *   Use @tauri-apps/plugin-store or platform keychain:
 *   - macOS: Keychain
 *   - Windows: Credential Manager
 *   - Linux: Secret Service (libsecret)
 *
 * Mobile (React Native/Expo):
 *   Use expo-secure-store:
 *   - iOS: Keychain
 *   - Android: Keystore with encrypted SharedPreferences
 *
 * Web:
 *   Use IndexedDB with encryption or Web Crypto SubtleCrypto
 *   for wrapping keys before storage.
 *
 * Each platform should implement KeyStorageAdapter interface
 * with the appropriate secure storage mechanism.
 */
