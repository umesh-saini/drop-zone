import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

        if (Platform.OS === 'android' && Platform.Version >= 33) {
           await messaging().requestPermission();
        }

        const token = await messaging().getToken();
        setFcmToken(token);

        unsubscribeTokenRefresh = messaging().onTokenRefresh((token: string) => {
          setFcmToken(token);
        });

        unsubscribeMessage = messaging().onMessage(async (remoteMessage: any) => {
          console.log('Foreground FCM Message:', JSON.stringify(remoteMessage));
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
