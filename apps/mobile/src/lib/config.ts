/**
 * Mobile app configuration from EXPO_PUBLIC_ environment variables.
 */
export const config = {
  serverUrl: process.env.EXPO_PUBLIC_SERVER_URL || 'http://192.168.29.225:3001',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'http://192.168.29.225:3001',
};
