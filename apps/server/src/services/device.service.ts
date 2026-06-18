import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Device, type IDevice } from '../models';
import { env } from '../config/env';

const DEVICE_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEVICE_CODE_LENGTH = 8;

/**
 * Generate a unique 8-character device code
 * Retries up to 10 times if collision detected
 */
export async function generateUniqueDeviceCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < DEVICE_CODE_LENGTH; i++) {
      const randomIndex = crypto.randomInt(0, DEVICE_CODE_CHARSET.length);
      code += DEVICE_CODE_CHARSET[randomIndex];
    }

    // Check if code already exists
    const existing = await Device.findOne({ deviceCode: code });
    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate unique device code after 10 attempts');
}

/**
 * Generate a secret token for device authentication
 */
function generateSecretToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate JWT token for a device
 */
export function generateJWT(deviceCode: string, deviceId: string): string {
  return jwt.sign({ deviceCode, deviceId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

/**
 * Register a new device
 */
export async function registerDevice(data: {
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  platform: 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'web';
  publicKey: string;
}): Promise<{ device: IDevice; token: string; secretToken: string }> {
  const deviceCode = await generateUniqueDeviceCode();
  const secretToken = generateSecretToken();

  // Hash the secret token before storing
  const hashedToken = crypto.createHash('sha256').update(secretToken).digest('hex');

  const device = await Device.create({
    deviceCode,
    deviceName: data.deviceName,
    deviceType: data.deviceType,
    platform: data.platform,
    publicKey: data.publicKey,
    secretToken: hashedToken,
  });

  const jwtToken = generateJWT(deviceCode, device._id.toString());

  return { device, token: jwtToken, secretToken };
}

/**
 * Authenticate device with code + secret token
 * Returns new JWT if valid
 */
export async function authenticateDevice(
  deviceCode: string,
  secretToken: string
): Promise<{ device: IDevice; token: string } | null> {
  const hashedToken = crypto.createHash('sha256').update(secretToken).digest('hex');
  const device = await Device.findOne({ deviceCode, secretToken: hashedToken });

  if (!device) return null;

  device.lastSeen = new Date();
  await device.save();

  const token = generateJWT(deviceCode, device._id.toString());
  return { device, token };
}

/**
 * Get device by code
 */
export async function getDeviceByCode(deviceCode: string): Promise<IDevice | null> {
  return Device.findOne({ deviceCode });
}

/**
 * Update device info
 */
export async function updateDevice(
  deviceCode: string,
  updates: Partial<Pick<IDevice, 'deviceName' | 'publicKey'>>
): Promise<IDevice | null> {
  return Device.findOneAndUpdate({ deviceCode }, updates, { new: true });
}
