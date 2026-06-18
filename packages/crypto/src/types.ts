/**
 * Type definitions for the crypto package
 */

/** Base64-encoded key pair */
export interface KeyPair {
  publicKey: string; // base64-encoded 32 bytes
  secretKey: string; // base64-encoded 32 bytes
}

/** Raw key pair as Uint8Array */
export interface RawKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/** Encrypted message envelope */
export interface EncryptedEnvelope {
  version: number; // protocol version (1)
  nonce: string; // base64-encoded 12-byte nonce (AES-GCM)
  ciphertext: string; // base64-encoded encrypted data
  tag: string; // included in ciphertext for AES-GCM (appended by Web Crypto)
  senderPublicKey: string; // base64-encoded sender public key
  timestamp: number; // unix timestamp ms
}

/** Lightweight encrypted payload for clipboard sync */
export interface EncryptedPayload {
  v: number; // version
  n: string; // nonce (base64)
  c: string; // ciphertext (base64, includes auth tag)
}

/** Key storage interface — implemented per platform */
export interface KeyStorageAdapter {
  saveKeyPair(deviceCode: string, keyPair: KeyPair): Promise<void>;
  getKeyPair(deviceCode: string): Promise<KeyPair | null>;
  saveSharedSecret(pairingId: string, secret: string): Promise<void>;
  getSharedSecret(pairingId: string): Promise<string | null>;
  deleteKeyPair(deviceCode: string): Promise<void>;
  deleteSharedSecret(pairingId: string): Promise<void>;
}
