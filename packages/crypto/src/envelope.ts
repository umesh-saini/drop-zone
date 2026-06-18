import { encrypt, encryptBinary } from './encrypt';
import { decrypt, decryptBinary } from './decrypt';
import type { EncryptedEnvelope, EncryptedPayload } from './types';

/**
 * Create a full encrypted envelope for transport.
 * Includes metadata (sender, timestamp) alongside encrypted content.
 *
 * @param plaintext - Data to encrypt
 * @param sharedSecretBase64 - Shared secret between sender and receiver
 * @param senderPublicKey - Sender's public key (for identification)
 * @returns Complete encrypted envelope ready for transmission
 */
export async function createEnvelope(
  plaintext: string,
  sharedSecretBase64: string,
  senderPublicKey: string
): Promise<EncryptedEnvelope> {
  const payload = await encrypt(plaintext, sharedSecretBase64);

  return {
    version: 1,
    nonce: payload.n,
    ciphertext: payload.c,
    tag: '', // AES-GCM tag is appended to ciphertext by Web Crypto
    senderPublicKey,
    timestamp: Date.now(),
  };
}

/**
 * Open an encrypted envelope and return the plaintext.
 *
 * @param envelope - The encrypted envelope
 * @param sharedSecretBase64 - Shared secret between sender and receiver
 * @returns Decrypted string content
 * @throws Error if decryption or verification fails
 */
export async function openEnvelope(
  envelope: EncryptedEnvelope,
  sharedSecretBase64: string
): Promise<string> {
  const payload: EncryptedPayload = {
    v: envelope.version,
    n: envelope.nonce,
    c: envelope.ciphertext,
  };

  return decrypt(payload, sharedSecretBase64);
}

/**
 * Create a lightweight encrypted payload for clipboard sync.
 * Smaller than full envelope — used for frequent, small messages.
 *
 * @param content - Clipboard text content
 * @param sharedSecretBase64 - Shared secret with target device
 * @returns Compact encrypted payload
 */
export async function encryptClipboard(
  content: string,
  sharedSecretBase64: string
): Promise<EncryptedPayload> {
  return encrypt(content, sharedSecretBase64);
}

/**
 * Decrypt a clipboard payload.
 *
 * @param payload - Encrypted clipboard payload
 * @param sharedSecretBase64 - Shared secret with sender device
 * @returns Decrypted clipboard content
 */
export async function decryptClipboard(
  payload: EncryptedPayload,
  sharedSecretBase64: string
): Promise<string> {
  return decrypt(payload, sharedSecretBase64);
}

/**
 * Encrypt a file chunk for transfer.
 *
 * @param chunk - Raw file data chunk
 * @param sharedSecretBase64 - Shared secret with target device
 * @returns Encrypted chunk payload
 */
export async function encryptFileChunk(
  chunk: Uint8Array,
  sharedSecretBase64: string
): Promise<EncryptedPayload> {
  return encryptBinary(chunk, sharedSecretBase64);
}

/**
 * Decrypt a file chunk.
 *
 * @param payload - Encrypted chunk payload
 * @param sharedSecretBase64 - Shared secret with sender device
 * @returns Decrypted raw file data
 */
export async function decryptFileChunk(
  payload: EncryptedPayload,
  sharedSecretBase64: string
): Promise<Uint8Array> {
  return decryptBinary(payload, sharedSecretBase64);
}
