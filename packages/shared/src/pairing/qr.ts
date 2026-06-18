import type { QRPairingData } from './types';

/**
 * QR code data encoding/decoding for device pairing.
 *
 * QR format: JSON string of QRPairingData, base64 encoded to keep it compact.
 * Max QR data: ~400 chars (fits in a standard QR code easily).
 */

/** QR code expiry time: 5 minutes */
const QR_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Generate QR pairing data for this device.
 * This data is encoded into the QR code that other devices scan.
 */
export function generateQRData(
  deviceCode: string,
  publicKey: string,
  deviceName: string,
  deviceType: 'desktop' | 'mobile' | 'web'
): QRPairingData {
  return {
    v: 1,
    code: deviceCode,
    publicKey,
    name: deviceName,
    type: deviceType,
    ts: Date.now(),
  };
}

/**
 * Encode QR pairing data to a string for the QR code.
 * Uses JSON + base64 for compact encoding.
 */
export function encodeQRData(data: QRPairingData): string {
  const json = JSON.stringify(data);
  // Use a URI-safe prefix so scanners know it's a DropZone code
  return `dropzone://pair/${btoa(json)}`;
}

/**
 * Decode a scanned QR string back to pairing data.
 * Returns null if invalid format.
 */
export function decodeQRData(qrString: string): QRPairingData | null {
  try {
    // Handle dropzone:// URI format
    if (qrString.startsWith('dropzone://pair/')) {
      const base64 = qrString.slice('dropzone://pair/'.length);
      const json = atob(base64);
      const data = JSON.parse(json) as QRPairingData;
      return validateQRData(data) ? data : null;
    }

    // Try plain JSON (legacy/debug)
    const data = JSON.parse(qrString) as QRPairingData;
    return validateQRData(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * Validate QR pairing data structure and expiry.
 */
export function validateQRData(data: QRPairingData): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.v !== 1) return false;
  if (!data.code || data.code.length !== 8) return false;
  if (!data.publicKey || data.publicKey.length < 10) return false;
  if (!data.name || data.name.length === 0) return false;
  if (!['desktop', 'mobile', 'web'].includes(data.type)) return false;
  if (!data.ts || typeof data.ts !== 'number') return false;

  // Check expiry
  if (Date.now() - data.ts > QR_EXPIRY_MS) return false;

  return true;
}

/**
 * Check if QR data has expired.
 */
export function isQRExpired(data: QRPairingData): boolean {
  return Date.now() - data.ts > QR_EXPIRY_MS;
}

/**
 * Get remaining validity time for QR data in seconds.
 */
export function getQRTimeRemaining(data: QRPairingData): number {
  const remaining = QR_EXPIRY_MS - (Date.now() - data.ts);
  return Math.max(0, Math.floor(remaining / 1000));
}
