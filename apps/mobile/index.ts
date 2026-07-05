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
      
      // Silently auto-copy to clipboard directly in the background
      try {
        await Clipboard.setStringAsync(plaintext);
        
        // Show a quick toast so the user knows it happened (Toast works in background on Android)
        const { Platform, ToastAndroid } = require('react-native');
        if (Platform.OS === 'android') {
          ToastAndroid.show('Clipboard synced from DropZone', ToastAndroid.SHORT);
        }
      } catch (e) {
        console.error('Background clipboard copy failed due to OS restrictions:', e);
      }

    } catch (e) {
      console.error('Failed to handle background clipboard push:', e);
    }
  }
});

registerRootComponent(App);
