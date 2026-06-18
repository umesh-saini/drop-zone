import { z } from "zod";

export const deviceCodeSchema = z
  .string()
  .length(8)
  .regex(
    /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/,
    "Invalid device code format",
  );

export const deviceSchema = z.object({
  deviceCode: deviceCodeSchema,
  deviceName: z.string().min(1).max(50),
  deviceType: z.enum(["desktop", "mobile", "web"]),
  platform: z.enum(["windows", "mac", "linux", "android", "ios", "web"]),
  publicKey: z.string(),
});

export const pairingRequestSchema = z.object({
  deviceACode: deviceCodeSchema,
  deviceBCode: deviceCodeSchema,
});

export const permissionSchema = z.object({
  pairingId: z.string().uuid(),
  permissionType: z.enum([
    "clipboard_read",
    "clipboard_write",
    "file_send",
    "file_receive",
    "file_access_read",
    "file_access_write",
    "notification_mirror",
  ]),
  direction: z.enum(["a_to_b", "b_to_a", "bidirectional"]),
  granted: z.boolean(),
});
