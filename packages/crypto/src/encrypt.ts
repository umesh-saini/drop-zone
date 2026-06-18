import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64, decodeUTF8 } from 'tweetnacl-util';
import type { EncryptedPayload } from './types';

/**
 * Encrypt data using NaCl secretbox (XSalsa20-Poly1305) with a shared secret.
 *
 * Works identically across all platforms:
 * - Node.js, Browsers, React Native (no Web Crypto dependency)
 *
 * @param plaintext - The string data to encrypt
 * @param sharedSecretBase64 - Base64-encoded 32-byte shared secret
 * @returns EncryptedPayload with nonce and ciphertext
 */
export async function encrypt(
  plaintext: string,
  sharedSecretBase64: string
): Promise<EncryptedPayload> {
  const key = decodeBase64(sharedSecretBase64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // 24 bytes
  const messageBytes = decodeUTF8(plaintext);

  const ciphertext = nacl.secretbox(messageBytes, nonce, key);

  return {
    v: 1,
    n: encodeBase64(nonce),
    c: encodeBase64(ciphertext),
  };
}

/**
 * Encrypt binary data (Uint8Array) using NaCl secretbox.
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
  const key = decodeBase64(sharedSecretBase64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const ciphertext = nacl.secretbox(data, nonce, key);

  return {
    v: 1,
    n: encodeBase64(nonce),
    c: encodeBase64(ciphertext),
  };
}
