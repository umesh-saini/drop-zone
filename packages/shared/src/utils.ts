import { DEVICE_CODE_CHARSET, DEVICE_CODE_LENGTH } from "./constants";

/**
 * Generate a unique 8-character device code
 */
export function generateDeviceCode(): string {
  let code = "";
  for (let i = 0; i < DEVICE_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * DEVICE_CODE_CHARSET.length);
    code += DEVICE_CODE_CHARSET[randomIndex];
  }
  return code;
}

/**
 * Validate device code format
 */
export function isValidDeviceCode(code: string): boolean {
  if (code.length !== DEVICE_CODE_LENGTH) return false;
  return code.split("").every((char) => DEVICE_CODE_CHARSET.includes(char));
}

/**
 * Format device code for display (e.g., ABCD-EFGH)
 */
export function formatDeviceCode(code: string): string {
  if (!isValidDeviceCode(code)) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
