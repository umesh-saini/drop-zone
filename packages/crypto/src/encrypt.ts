import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import type { EncryptedPayload } from './types';

/**
 * Encrypt data using AES-256-GCM with a shared secret key.
 *
 * Uses the Web Crypto API which is available in:
 * - Node.js (globalThis.crypto)
 * - Browsers (window.crypto)
 * - React Native (expo-crypto polyfill)
 *
 * @param plaintext - The string data to encrypt
 * @param sharedSecretBase64 - Base64-encoded 32-byte shared secret
 * @returns EncryptedPayload with nonce and ciphertext
 */
export async function encrypt(
  plaintext: string,
  sharedSecretBase64: string
): Promise<EncryptedPayload> {
  const keyBytes = decodeBase64(sharedSecretBase64);

  // Import key for AES-256-GCM
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate random 12-byte nonce (IV)
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));

  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Encrypt (AES-256-GCM appends 16-byte auth tag to ciphertext)
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    cryptoKey,
    plaintextBytes as BufferSource
  );

  return {
    v: 1,
    n: encodeBase64(nonce),
    c: encodeBase64(new Uint8Array(ciphertextBuffer)),
  };
}

/**
 * Encrypt binary data (Uint8Array) using AES-256-GCM.
 * Used for file chunks.
 *
 * @param data - Binary data to encrypt
 * @param sharedSecretBase64 - Base64-encoded 32-byte shared secret
 * @returns EncryptedPayload with nonce and ciphertext
 */
export async function encryptBinary(
  data: Uint8Array,
  sharedSecretBase64: string
): Promise<EncryptedPayload> {
  const keyBytes = decodeBase64(sharedSecretBase64);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    cryptoKey,
    data as BufferSource
  );

  return {
    v: 1,
    n: encodeBase64(nonce),
    c: encodeBase64(new Uint8Array(ciphertextBuffer)),
  };
}
