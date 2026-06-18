import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

/**
 * Generate a new X25519 key pair for encryption
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Decode base64 key strings back to Uint8Array
 */
export function decodeKeyPair(keyPair: KeyPair) {
  return {
    publicKey: decodeBase64(keyPair.publicKey),
    secretKey: decodeBase64(keyPair.secretKey),
  };
}
