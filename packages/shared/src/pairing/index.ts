// QR Code
export {
  generateQRData,
  encodeQRData,
  decodeQRData,
  validateQRData,
  isQRExpired,
  getQRTimeRemaining,
} from './qr';

// PIN
export {
  generatePIN,
  createPairingPIN,
  isValidPINFormat,
  isPINExpired,
  getPINTimeRemaining,
  formatPIN,
} from './pin';
export type { PairingPIN } from './pin';

// Pairing Flow
export { PairingFlow } from './PairingFlow';

// Permissions UI
export {
  PERMISSION_DISPLAY,
  getAllPermissionDisplayItems,
  buildPermissionDisplay,
  getDirectionLabel,
  DEFAULT_PERMISSIONS,
} from './permissions';

// Device Management
export {
  getDeviceTypeIcon,
  getPlatformIcon,
  getLastSeenText,
  sortPairedDevices,
  formatDeviceCode as formatDeviceCodeDisplay,
  getStatusColor,
} from './devices';

// Types
export type {
  QRPairingData,
  PairingMethod,
  PairingFlowState,
  PairingFlowEvent,
  PeerDeviceInfo,
  PairedDeviceInfo,
  PermissionDisplayItem,
} from './types';
