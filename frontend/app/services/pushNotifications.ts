import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// We dynamically require expo-notifications to avoid crashes in Expo Go Android (SDK 53)
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn("Failed to load expo-notifications", e);
  }
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) {
    console.log("Push notifications not supported in Expo Go on Android.");
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
         token = (await Notifications.getExpoPushTokenAsync()).data;
      }
    } catch (e) {
      console.error("Error getting push token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
