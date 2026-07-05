import { useState, useEffect } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';

export function useFCM() {
  const [fcmToken, setFcmToken] = useState<string>();

  useEffect(() => {
    // Do not run Firebase native code in Expo Go
    if (Constants.appOwnership === 'expo') {
      console.log('Firebase Cloud Messaging is not supported in Expo Go. Use a development build.');
      return;
    }

    let unsubscribeTokenRefresh: () => void;
    let unsubscribeMessage: () => void;

    async function setupFCM() {
      try {
        // Dynamically require to prevent top-level native module crashes in Expo Go
        const messaging = require('@react-native-firebase/messaging').default;
        
        if (Platform.OS === 'ios') {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging().AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging().AuthorizationStatus.PROVISIONAL;
            
          if (!enabled) {
            console.log('User declined messaging permissions');
            return;
          }
        }

        const notifee = require('@notifee/react-native').default;
        
        // Request permissions using Notifee (works great on iOS and Android 13+)
        await notifee.requestPermission();

        const token = await messaging().getToken();
        setFcmToken(token);

        unsubscribeTokenRefresh = messaging().onTokenRefresh((token: string) => {
          setFcmToken(token);
        });

        unsubscribeMessage = messaging().onMessage(async (remoteMessage: any) => {
          // Socket handles clipboard when app is in foreground, so we just log this.
          console.log('Foreground FCM Data Message:', JSON.stringify(remoteMessage));
        });

        // Handle lingering foreground notification interactions
        notifee.onForegroundEvent(async ({ type, detail }: any) => {
          if (type === 1 /* EventType.ACTION_PRESS */ && detail.pressAction?.id === 'copy') {
            const textToCopy = detail.notification?.data?.textToCopy;
            if (textToCopy) {
              await Clipboard.setStringAsync(textToCopy);
              if (Platform.OS === 'android') {
                ToastAndroid.show('Copied to clipboard!', ToastAndroid.SHORT);
              }
              if (detail.notification?.id) {
                await notifee.cancelNotification(detail.notification.id);
              }
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize FCM or get token:', err);
      }
    }

    setupFCM();

    return () => {
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
      if (unsubscribeMessage) unsubscribeMessage();
    };
  }, []);

  return { fcmToken };
}
