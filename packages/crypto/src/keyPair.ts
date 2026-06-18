import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import type { KeyPair, RawKeyPair } from './types';

/**
 * Generate a new X25519 key pair for encryption.
 * Returns base64-encoded keys for storage/transport.
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Decode base64 key pair strings back to Uint8Array.
 */
export function decodeKeyPair(keyPair: KeyPair): RawKeyPair {
  return {
    publicKey: decodeBase64(keyPair.publicKey),
    secretKey: decodeBase64(keyPair.secretKey),
  };
}

/**
 * Encode raw key pair to base64 strings.
 */
export function encodeKeyPairToBase64(raw: RawKeyPair): KeyPair {
  return {
    publicKey: encodeBase64(raw.publicKey),
    secretKey: encodeBase64(raw.secretKey),
  };
}

/**
 * Validate a public key (must be 32 bytes when decoded).
 */
export function isValidPublicKey(publicKeyBase64: string): boolean {
  try {
    const bytes = decodeBase64(publicKeyBase64);
    return bytes.length === 32;
  } catch {
    return false;
  }
}
