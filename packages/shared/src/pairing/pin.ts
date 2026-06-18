/**
 * PIN-based pairing as a fallback when QR scanning isn't available.
 *
 * Flow:
 * 1. Device A generates a temporary 6-digit PIN
 * 2. User reads PIN aloud or shows it on screen
 * 3. Device B enters the PIN
 * 4. Server verifies PIN matches and links devices for pairing
 *
 * PINs expire after 2 minutes for security.
 */

/** PIN length */
const PIN_LENGTH = 6;

/** PIN expiry: 2 minutes */
const PIN_EXPIRY_MS = 2 * 60 * 1000;

/** Generated PIN with metadata */
export interface PairingPIN {
  pin: string;
  deviceCode: string;
  publicKey: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a random 6-digit numeric PIN.
 */
export function generatePIN(): string {
  let pin = '';
  for (let i = 0; i < PIN_LENGTH; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

/**
 * Create a pairing PIN with metadata.
 */
export function createPairingPIN(deviceCode: string, publicKey: string): PairingPIN {
  const now = Date.now();
  return {
    pin: generatePIN(),
    deviceCode,
    publicKey,
    createdAt: now,
    expiresAt: now + PIN_EXPIRY_MS,
  };
}

/**
 * Validate PIN format (6 digits).
 */
export function isValidPINFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Check if a PIN has expired.
 */
export function isPINExpired(pin: PairingPIN): boolean {
  return Date.now() > pin.expiresAt;
}

/**
 * Get remaining time for PIN in seconds.
 */
export function getPINTimeRemaining(pin: PairingPIN): number {
  const remaining = pin.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}

/**
 * Format PIN for display (with space in middle: 123 456).
 */
export function formatPIN(pin: string): string {
  if (pin.length !== PIN_LENGTH) return pin;
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}
