import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Derive a shared secret using X25519 Diffie-Hellman key exchange.
 *
 * Both parties compute the same shared secret:
 *   Device A: deriveSharedSecret(A.secretKey, B.publicKey)
 *   Device B: deriveSharedSecret(B.secretKey, A.publicKey)
 *
 * The result is a 32-byte key used as the AES-256-GCM symmetric key.
 *
 * @param mySecretKeyBase64 - This device's secret key (base64)
 * @param theirPublicKeyBase64 - The other device's public key (base64)
 * @returns Base64-encoded 32-byte shared secret
 */
export function deriveSharedSecret(
  mySecretKeyBase64: string,
  theirPublicKeyBase64: string
): string {
  const mySecretKey = decodeBase64(mySecretKeyBase64);
  const theirPublicKey = decodeBase64(theirPublicKeyBase64);

  // X25519 scalar multiplication: shared = mySecret * theirPublic
  const sharedSecret = nacl.scalarMult(mySecretKey, theirPublicKey);

  // Hash the raw shared point with HSalsa20 for a uniform key
  // TweetNaCl's box.before() does exactly this
  const symmetricKey = nacl.box.before(theirPublicKey, mySecretKey);

  return encodeBase64(symmetricKey);
}

/**
 * Decode a base64 shared secret to raw bytes.
 */
export function decodeSharedSecret(secretBase64: string): Uint8Array {
  return decodeBase64(secretBase64);
}

/**
 * Verify that two devices will compute the same shared secret.
 * Used during pairing verification step.
 */
export function verifyKeyExchange(
  deviceAPublicKey: string,
  deviceASecretKey: string,
  deviceBPublicKey: string,
  deviceBSecretKey: string
): boolean {
  const secretFromA = deriveSharedSecret(deviceASecretKey, deviceBPublicKey);
  const secretFromB = deriveSharedSecret(deviceBSecretKey, deviceAPublicKey);
  return secretFromA === secretFromB;
}
