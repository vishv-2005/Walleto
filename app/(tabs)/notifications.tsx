import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';

type NotificationType = {
  text: string;
  date: string;
  done: boolean;
};

export default function Notifications() {

  const { darkMode } = useContext(ThemeContext);

  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');

      let data: NotificationType[] = [];

      if (stored) {
        const parsed = JSON.parse(stored);

        // 🔥 FIX (important)
        if (Array.isArray(parsed)) {
          data = parsed;
        }
      }

      if (data.length === 0) {
        data = [
          {
            text: "New order received",
            date: new Date().toISOString(),
            done: false
          },
          {
            text: "Complaint needs attention",
            date: new Date().toISOString(),
            done: false
          }
        ];

        await AsyncStorage.setItem('notifications', JSON.stringify(data));
      }

      setNotifications(data);

    } catch (err) {
      console.log(err);
    }
  };

  const toggleDone = async (index: number) => {
    const updated = [...notifications];
    updated[index].done = !updated[index].done;

    setNotifications(updated);
    await AsyncStorage.setItem('notifications', JSON.stringify(updated));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>

      <Text style={[styles.title, { color: text }]}>
        Notifications
      </Text>

      {notifications.map((n, i) => (
        <View key={i} style={[styles.card, { backgroundColor: card }]}>
          <View style={styles.row}>

            <Switch
              value={n.done}
              onValueChange={() => toggleDone(i)}
            />

            <View>
              <Text style={[
                { color: text },
                n.done && styles.done
              ]}>
                {n.text}
              </Text>

              <Text style={styles.date}>
                {new Date(n.date).toDateString()}
              </Text>
            </View>

          </View>
        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, borderRadius: 12, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  done: { textDecorationLine: 'line-through', color: '#999' },
  date: { fontSize: 12, color: '#888' }
});