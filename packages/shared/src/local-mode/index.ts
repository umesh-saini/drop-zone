export { LocalModeManager } from './LocalModeManager';
export { ConnectionRouter } from './ConnectionRouter';
export {
  MockDiscoveryAdapter,
  DISCOVERY_PORT,
  BROADCAST_ADDRESS,
  encodeAdvertisement,
  decodeAdvertisement,
  advertisementToDevice,
} from './UDPDiscovery';
export type {
  DiscoveredDevice,
  DiscoveryAdapter,
  LocalAdvertisement,
  LocalConnectionState,
  LocalModeConfig,
  LocalModeEvent,
  LocalModeEventType,
} from './types';
export type { ConnectionMode as LocalConnectionMode } from './types';
