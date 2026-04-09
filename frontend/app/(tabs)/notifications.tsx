import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch
} from 'react-native';
import { getNotifications, toggleNotificationRead } from '../services/api';
import { ThemeContext } from '../context/ThemeContext';

type NotificationType = {
  id: string;
  text: string;
  from?: string;
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
    const interval = setInterval(() => {
      loadNotifications();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error loading notifications:', err);
    }
  };

  const toggleDone = async (index: number) => {
    const item = notifications[index];
    if (!item?.id) return;
    try {
      await toggleNotificationRead(item.id);
      await loadNotifications();
    } catch (err) {
      console.log('Error toggling notification:', err);
    }
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