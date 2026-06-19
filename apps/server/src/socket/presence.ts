/**
 * In-memory online presence registry.
 *
 * Tracks which device codes currently have an active socket connection.
 * Faster and more reliable than querying the DB for real-time presence.
 *
 * A device may have multiple sockets (e.g. reconnects), so we count sockets
 * per device and only mark it offline when the last socket disconnects.
 */

// deviceCode -> set of socketIds
const online = new Map<string, Set<string>>();

/**
 * Mark a device socket as online.
 * Returns true if this is the device's first connection (was offline before).
 */
export function addConnection(deviceCode: string, socketId: string): boolean {
  let sockets = online.get(deviceCode);
  const wasOffline = !sockets || sockets.size === 0;
  if (!sockets) {
    sockets = new Set();
    online.set(deviceCode, sockets);
  }
  sockets.add(socketId);
  return wasOffline;
}

/**
 * Remove a device socket.
 * Returns true if the device is now fully offline (no remaining sockets).
 */
export function removeConnection(deviceCode: string, socketId: string): boolean {
  const sockets = online.get(deviceCode);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    online.delete(deviceCode);
    return true;
  }
  return false;
}

/**
 * Whether a device is currently online.
 */
export function isOnline(deviceCode: string): boolean {
  const sockets = online.get(deviceCode);
  return !!sockets && sockets.size > 0;
}

/**
 * Filter a list of device codes to only those currently online.
 */
export function filterOnline(deviceCodes: string[]): string[] {
  return deviceCodes.filter((code) => isOnline(code));
}

/**
 * Get all online device codes (for debugging/metrics).
 */
export function getOnlineDevices(): string[] {
  return Array.from(online.keys());
}
