import nacl from 'tweetnacl';
import { decodeBase64, encodeUTF8 } from 'tweetnacl-util';
import type { EncryptedPayload } from './types';

/**
 * Decrypt data using NaCl secretbox (XSalsa20-Poly1305) with a shared secret.
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

  const key = decodeBase64(sharedSecretBase64);
  const nonce = decodeBase64(payload.n);
  const ciphertext = decodeBase64(payload.c);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
  if (!decrypted) {
    throw new Error('Decryption failed: invalid key or tampered data');
  }

  return encodeUTF8(decrypted);
}

/**
 * Decrypt binary data (Uint8Array) using NaCl secretbox.
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

  const key = decodeBase64(sharedSecretBase64);
  const nonce = decodeBase64(payload.n);
  const ciphertext = decodeBase64(payload.c);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
  if (!decrypted) {
    throw new Error('Decryption failed: invalid key or tampered data');
  }

  return decrypted;
}
