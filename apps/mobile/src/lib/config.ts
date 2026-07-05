/**
 * Mobile app configuration from EXPO_PUBLIC_ environment variables.
 */
export const config = {
  serverUrl: process.env.EXPO_PUBLIC_SERVER_URL || 'https://drop.devswitch.in',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'https://drop.devswitch.in',
};
