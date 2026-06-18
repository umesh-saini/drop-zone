import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

/**
 * Mobile crypto — matches @dropzone/crypto format (NaCl secretbox).
 * Cross-compatible with desktop and web E2E encryption.
 */

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface EncryptedPayload {
  v: number;
  n: string;
  c: string;
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

export function deriveSharedSecret(
  mySecretKeyBase64: string,
  theirPublicKeyBase64: string
): string {
  const mySecret = decodeBase64(mySecretKeyBase64);
  const theirPublic = decodeBase64(theirPublicKeyBase64);
  const symmetricKey = nacl.box.before(theirPublic, mySecret);
  return encodeBase64(symmetricKey);
}

export function encrypt(plaintext: string, sharedSecretBase64: string): EncryptedPayload {
  const key = decodeBase64(sharedSecretBase64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(decodeUTF8(plaintext), nonce, key);
  return { v: 1, n: encodeBase64(nonce), c: encodeBase64(ciphertext) };
}

export function decrypt(payload: EncryptedPayload, sharedSecretBase64: string): string {
  const key = decodeBase64(sharedSecretBase64);
  const nonce = decodeBase64(payload.n);
  const ciphertext = decodeBase64(payload.c);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
  if (!decrypted) throw new Error('Decryption failed');
  return encodeUTF8(decrypted);
}
