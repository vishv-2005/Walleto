import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {

  const router = useRouter();

  useEffect(() => {
    (async () => {
      const loggedIn = await AsyncStorage.getItem('loggedIn');

      if (loggedIn === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth');
      }
    })();
  }, [router]);

  return null;
}