import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { useContext, useEffect } from 'react';
import { registerForPushNotificationsAsync } from './services/pushNotifications';
import { getStoredUser, registerPushToken } from './services/api';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function AppLayout() {
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    async function setupPushNotifications() {
      if (isExpoGo) {
        console.log("Push notifications are not supported in Expo Go on Android (SDK 53+). Skipping registration.");
        return;
      }

      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          const user = await getStoredUser();
          if (user?.email) {
            await registerPushToken(user.email, token);
            console.log("Push token registered for:", user.email);
          }
        }
      } catch (error) {
        console.error("Error setting up push notifications:", error);
      }
    }

    setupPushNotifications();

    let subscription: any;
    if (!isExpoGo) {
      try {
        const Notifications = require('expo-notifications');
        subscription = Notifications.addNotificationReceivedListener((notification: any) => {
          console.log("Foreground notification received:", notification);
        });
      } catch (e) {
        console.warn("Failed to load expo-notifications for listener", e);
      }
    }

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={darkMode ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>
  );
}