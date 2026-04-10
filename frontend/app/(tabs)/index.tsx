import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStats, getMessages } from '../services/api';

type MessageItem = {
  id: string;
  message: string;
  category: string;
  name: string;
  timestamp: string;
};

export default function HomeScreen() {

  const { darkMode } = useContext(ThemeContext);

  const [stats, setStats] = useState({ total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0 });
  const [recentMessages, setRecentMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bg = darkMode ? '#0f0f0f' : '#f5f7fa';
  const card = darkMode ? '#1c1c1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';
  const subText = darkMode ? '#9ca3af' : '#6b7280';

  const fetchData = useCallback(async () => {
    try {
      const [statsData, messagesData] = await Promise.all([getStats(), getMessages()]);
      setStats(statsData);
      setRecentMessages(messagesData.slice(0, 5));
    } catch (err) {
      console.log('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 1500);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >

        <Text style={[styles.title, { color: text }]}>
          Dashboard
        </Text>

        {/* STAT CARDS ROW 1 */}
        <View style={styles.cards}>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: subText, fontSize: 12 }}>Total Messages</Text>
            <Text style={[styles.number, { color: text }]}>{stats.total}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: subText, fontSize: 12 }}>Orders</Text>
            <Text style={[styles.number, { color: '#22c55e' }]}>{stats.orders}</Text>
          </View>
        </View>

        {/* STAT CARDS ROW 2 */}
        <View style={[styles.cards, { marginTop: 12 }]}>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: subText, fontSize: 12 }}>Complaints</Text>
            <Text style={[styles.number, { color: '#ef4444' }]}>{stats.complaints}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: subText, fontSize: 12 }}>Inquiries</Text>
            <Text style={[styles.number, { color: '#3b82f6' }]}>{stats.inquiries}</Text>
          </View>
        </View>

        {/* STAT CARDS ROW 3 */}
        <View style={[styles.cards, { marginTop: 12 }]}>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: subText, fontSize: 12 }}>Feedback</Text>
            <Text style={[styles.number, { color: '#f59e0b' }]}>{stats.feedback}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: subText, fontSize: 12 }}>Invalid</Text>
            <Text style={[styles.number, { color: text }]}>{stats.invalid}</Text>
          </View>
        </View>

        {/* RECENT MESSAGES */}
        <Text style={[styles.taskTitle, { color: text }]}>
          Recent Messages
        </Text>

        {recentMessages.length === 0 ? (
          <Text style={{ color: subText, marginTop: 12 }}>No messages yet. Send a WhatsApp message to get started!</Text>
        ) : (
          recentMessages.map((msg) => (
            <View key={msg.id} style={[styles.task, { backgroundColor: card }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: text, fontWeight: '500' }} numberOfLines={1}>{msg.message}</Text>
                <Text style={{ color: subText, fontSize: 12, marginTop: 4 }}>
                  {msg.name} · {msg.category}
                </Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  cards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  card: {
    width: '48%',
    padding: 20,
    borderRadius: 20,
    elevation: 5,
  },

  number: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 5,
  },

  taskTitle: {
    marginTop: 25,
    fontSize: 20,
    fontWeight: '600',
  },

  task: {
    marginTop: 12,
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});