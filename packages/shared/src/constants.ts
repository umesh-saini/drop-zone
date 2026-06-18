// Device code configuration
export const DEVICE_CODE_LENGTH = 8;
export const DEVICE_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes confusing chars: 0, O, I, 1

// Permission types
export const PERMISSION_TYPES = [
  "clipboard_read",
  "clipboard_write",
  "file_send",
  "file_receive",
  "file_access_read",
  "file_access_write",
  "notification_mirror",
] as const;

// Connection limits
export const MAX_FILE_SIZE = 1024 * 1024 * 1024 * 2; // 2GB
export const MAX_CLIPBOARD_SIZE = 1024 * 1024 * 10; // 10MB
export const SESSION_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes

// Rate limits
export const RATE_LIMIT_WINDOW_MS = 1000 * 60; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;
