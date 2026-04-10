import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStats, getMessages } from '../services/api';

type MessageItem = {
  id: string;
  from: string;
  message: string;
  category: string;
  name: string;
  timestamp: string;
  status?: string;
  statusUpdatedAt?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { darkMode } = useContext(ThemeContext);

  const [stats, setStats] = useState({ total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0 });
  const [reminderMessages, setReminderMessages] = useState<MessageItem[]>([]);
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
      
      const now = new Date().getTime();
      const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
      
      const reminders = messagesData.filter((msg: MessageItem) => {
        const timeToUse = msg.statusUpdatedAt || msg.timestamp;
        const msgTime = new Date(timeToUse).getTime();
        const isOld = (now - msgTime) >= FOUR_DAYS_MS;
        
        const cat = msg.category ? msg.category.toLowerCase() : '';
        if (cat === 'feedback' || cat === 'invalid' || cat === 'irrelevant') return false;
        
        // Default to pending if it's an actionable category but missing an explicit status (from old datasets)
        const s = msg.status ? msg.status.toLowerCase() : 'pending';
        const isPending = !(s === 'completed' || s === 'resolved' || s === 'answered');
        
        return isOld && isPending;
      });
      
      reminders.sort((a: MessageItem, b: MessageItem) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setReminderMessages(reminders);
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

          <View style={[styles.card, { backgroundColor: darkMode ? '#3f1d1d' : '#fee2e2', borderWidth: 1, borderColor: '#ef4444' }]}>
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>Reminders</Text>
            <Text style={[styles.number, { color: '#ef4444' }]}>{reminderMessages.length}</Text>
          </View>
        </View>

        {/* REMINDER MESSAGES */}
        <Text style={[styles.taskTitle, { color: '#ef4444' }]}>
          ⚠️ Reminder Messages (Action Required)
        </Text>

        {reminderMessages.length === 0 ? (
          <Text style={{ color: subText, marginTop: 12 }}>No pending messages older than 4 days.</Text>
        ) : (
          reminderMessages.map((msg) => {
            const timeToUse = msg.statusUpdatedAt || msg.timestamp;
            const daysOld = Math.floor((new Date().getTime() - new Date(timeToUse).getTime()) / (1000 * 60 * 60 * 24));
            return (
              <View key={msg.id} style={[styles.task, { backgroundColor: card, borderLeftWidth: 4, borderLeftColor: '#ef4444', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ backgroundColor: darkMode ? '#3f1d1d' : '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                      <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>{msg.category.toUpperCase()}</Text>
                    </View>
                    <View style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: subText, fontSize: 10, fontWeight: 'bold' }}>{msg.status || 'Pending'}</Text>
                    </View>
                  </View>
                  
                  <Text style={{ color: text, fontWeight: '600', fontSize: 15, marginBottom: 4 }} numberOfLines={1}>
                    {msg.message}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
                    <Text style={{ color: subText, fontSize: 12 }}>
                      {msg.name} · {new Date(msg.timestamp).toLocaleDateString()}
                    </Text>
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>
                      ⚠️ {daysOld} days late
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, justifyContent: 'center', marginLeft: 12 }}
                  onPress={() => router.push({ pathname: '/messages', params: { customerFrom: msg.from } })}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Address</Text>
                </TouchableOpacity>
              </View>
            );
          })
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