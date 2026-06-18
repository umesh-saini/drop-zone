/**
 * Web app configuration from environment variables.
 */
export const config = {
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
};
