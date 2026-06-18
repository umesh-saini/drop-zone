/**
 * Socket.io event names used across the system
 */
export const SocketEvents = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Device events
  DEVICE_REGISTER: 'device:register',
  DEVICE_ONLINE: 'device:online',
  DEVICE_OFFLINE: 'device:offline',

  // Pairing events
  PAIRING_REQUEST: 'pairing:request',
  PAIRING_ACCEPT: 'pairing:accept',
  PAIRING_REJECT: 'pairing:reject',
  PAIRING_REVOKE: 'pairing:revoke',

  // Clipboard events
  CLIPBOARD_SYNC: 'clipboard:sync',
  CLIPBOARD_UPDATE: 'clipboard:update',

  // File transfer events
  FILE_OFFER: 'file:offer',
  FILE_ACCEPT: 'file:accept',
  FILE_REJECT: 'file:reject',
  FILE_CHUNK: 'file:chunk',
  FILE_COMPLETE: 'file:complete',
  FILE_ERROR: 'file:error',

  // Permission events
  PERMISSION_UPDATE: 'permission:update',
  PERMISSION_REQUEST: 'permission:request',

  // Remote file access events
  REMOTE_REQUEST: 'remote:request',
  REMOTE_RESPONSE: 'remote:response',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];
