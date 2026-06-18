import { decodeBase64 } from 'tweetnacl-util';
import type { EncryptedPayload } from './types';

/**
 * Decrypt data using AES-256-GCM with a shared secret key.
 *
 * @param payload - The encrypted payload (nonce + ciphertext)
 * @param sharedSecretBase64 - Base64-encoded 32-byte shared secret
 * @returns Decrypted string
 * @throws Error if decryption fails (wrong key, tampered data)
 */
export async function decrypt(
  payload: EncryptedPayload,
  sharedSecretBase64: string
): Promise<string> {
  if (payload.v !== 1) {
    throw new Error(`Unsupported encryption version: ${payload.v}`);
  }

  const keyBytes = decodeBase64(sharedSecretBase64);
  const nonce = decodeBase64(payload.n);
  const ciphertext = decodeBase64(payload.c);

  // Import key for AES-256-GCM
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt (AES-GCM verifies auth tag automatically)
  const plaintextBuffer = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    cryptoKey,
    ciphertext as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBuffer);
}

/**
 * Decrypt binary data (Uint8Array) using AES-256-GCM.
 * Used for file chunks.
 *
 * @param payload - The encrypted payload (nonce + ciphertext)
 * @param sharedSecretBase64 - Base64-encoded 32-byte shared secret
 * @returns Decrypted binary data
 * @throws Error if decryption fails
 */
export async function decryptBinary(
  payload: EncryptedPayload,
  sharedSecretBase64: string
): Promise<Uint8Array> {
  if (payload.v !== 1) {
    throw new Error(`Unsupported encryption version: ${payload.v}`);
  }

  const keyBytes = decodeBase64(sharedSecretBase64);
  const nonce = decodeBase64(payload.n);
  const ciphertext = decodeBase64(payload.c);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const plaintextBuffer = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    cryptoKey,
    ciphertext as BufferSource
  );

  return new Uint8Array(plaintextBuffer);
}
