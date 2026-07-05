import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import * as Clipboard from 'expo-clipboard';
import * as storage from './src/services/storage';
import { decrypt } from './src/services/crypto';
import App from './App';

// Background Data Message Handler (wakes up on silent pushes)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (remoteMessage.data?.type === 'clipboard:update' && remoteMessage.data?.encryptedContent) {
    try {
      const { encryptedContent, pairingId, fromDeviceCode } = remoteMessage.data;
      const secret = await storage.getSharedSecret(pairingId);
      if (!secret) return;

      const plaintext = decrypt(JSON.parse(encryptedContent), secret);

      // Create a notification channel for Android
      const channelId = await notifee.createChannel({
        id: 'clipboard',
        name: 'Clipboard Sync',
        importance: AndroidImportance.HIGH,
      });

      // Display the local notification with decrypted text and a "Copy" button
      await notifee.displayNotification({
        title: `Clipboard from ${fromDeviceCode || 'a device'}`,
        body: plaintext,
        data: { textToCopy: plaintext },
        android: {
          channelId,
          pressAction: { id: 'default' },
          actions: [
            { title: 'Copy', pressAction: { id: 'copy' } }
          ],
        },
        ios: {
          categoryId: 'clipboard',
        }
      });

      // Auto-copy to clipboard if device allows background clipboard access
      try {
        await Clipboard.setStringAsync(plaintext);
      } catch (e) { }

    } catch (e) {
      console.error('Failed to handle background clipboard push:', e);
    }
  }
});

// Background Notification Action Handler (when user presses "Copy" on the notification)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'copy') {
    const textToCopy = detail.notification?.data?.textToCopy as string;
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      // Cancel the notification after copying
      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    }
  }
});

registerRootComponent(App);
