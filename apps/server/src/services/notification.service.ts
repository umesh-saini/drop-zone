import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';
import { getDeviceByCode } from './device.service';

// Initialize Firebase Admin lazily to avoid crashing if credentials are missing
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;
  
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-admin.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized for FCM.');
      return true;
    } else {
      console.warn('⚠️ firebase-admin.json not found. Push notifications will be disabled.');
      return false;
    }
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
    return false;
  }
}

export const notificationService = {
  /**
   * Send a push notification to a specific device if it has an FCM token registered.
   */
  async sendDataNotification(targetDeviceCode: string, data: Record<string, string>): Promise<void> {
    if (!initFirebase()) return;
    try {
      const device = await getDeviceByCode(targetDeviceCode);
      if (!device || !device.fcmToken) return;

      const message: Message = {
        token: device.fcmToken,
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { 'content-available': 1 } } }
      };
      console.log('FCM Data notification data:', data);
      await getMessaging().send(message);
      console.log(`📨 FCM Data notification sent to device ${targetDeviceCode}`);
    } catch (err: any) {
      if (err.code === 'messaging/registration-token-not-registered') {
        console.warn(`⚠️ FCM token for device ${targetDeviceCode} is no longer valid. Clearing token.`);
        try {
          const { Device } = await import('../models');
          await Device.findOneAndUpdate({ deviceCode: targetDeviceCode }, { $unset: { fcmToken: 1 } });
        } catch (dbErr) {
          console.error(`❌ Failed to clear invalid FCM token for ${targetDeviceCode}:`, dbErr);
        }
      } else {
        console.error(`❌ Error sending FCM data notification to ${targetDeviceCode}:`, err);
      }
    }
  },

  async sendNotification(
    targetDeviceCode: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (!initFirebase()) return;

    try {
      const device = await getDeviceByCode(targetDeviceCode);
      if (!device || !device.fcmToken) {
        return; // Device not found or no FCM token registered
      }

      const message: Message = {
        token: device.fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            }
          }
        }
      };

      await getMessaging().send(message);
      console.log(`📨 FCM Push notification sent to device ${targetDeviceCode}`);
    } catch (err: any) {
      if (err.code === 'messaging/registration-token-not-registered') {
        console.warn(`⚠️ FCM token for device ${targetDeviceCode} is no longer valid. Clearing token.`);
        try {
          const { Device } = await import('../models');
          await Device.findOneAndUpdate({ deviceCode: targetDeviceCode }, { $unset: { fcmToken: 1 } });
        } catch (dbErr) {
          console.error(`❌ Failed to clear invalid FCM token for ${targetDeviceCode}:`, dbErr);
        }
      } else {
        console.error(`❌ Error sending FCM push notification to ${targetDeviceCode}:`, err);
      }
    }
  },
};
