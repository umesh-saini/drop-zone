import { decodeBase64, encodeUTF8 } from 'tweetnacl-util';

/**
 * Pairing data encoded in a QR code (matches desktop/web format).
 */
export interface QRPairingData {
  v: number;
  code: string;
  publicKey: string;
  name: string;
  type: 'desktop' | 'mobile' | 'web';
  ts: number;
}

const QR_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Decode a scanned QR string (dropzone://pair/<base64>) into pairing data.
 * Returns null if invalid or expired.
 */
export function decodeQRData(qrString: string): QRPairingData | null {
  try {
    let base64: string;
    if (qrString.startsWith('dropzone://pair/')) {
      base64 = qrString.slice('dropzone://pair/'.length);
    } else {
      return null;
    }

    const json = encodeUTF8(decodeBase64(base64));
    const data = JSON.parse(json) as QRPairingData;

    if (data.v !== 1) return null;
    if (!data.code || data.code.length !== 8) return null;
    if (!data.publicKey) return null;
    if (Date.now() - data.ts > QR_EXPIRY_MS) return null;

    return data;
  } catch {
    return null;
  }
}
