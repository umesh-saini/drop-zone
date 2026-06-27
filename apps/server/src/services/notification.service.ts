import * as admin from 'firebase-admin';
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
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
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

      const message: admin.messaging.Message = {
        token: device.fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
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

      await admin.messaging().send(message);
      console.log(`📨 FCM Push notification sent to device ${targetDeviceCode}`);
    } catch (err) {
      console.error(`❌ Error sending FCM push notification to ${targetDeviceCode}:`, err);
    }
  },
};
