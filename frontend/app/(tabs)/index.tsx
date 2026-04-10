import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStats, getMessages } from '../services/api';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// ━━━ COLOR SYSTEM ━━━
const C = {
  accent:   '#6366f1',
  emerald:  '#10b981',
  amber:    '#f59e0b',
  blue:     '#3b82f6',
  red:      '#ef4444',
  purple:   '#8b5cf6',
  slate:    '#64748b',
};

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

// ━━━ LIVE PULSE ━━━
function LivePulse() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
      <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.emerald }, style]} />
      <Text style={{ color: C.emerald, fontSize: 10, fontWeight: '700', marginLeft: 4 }}>LIVE</Text>
    </View>
  );
}

// ━━━ STAT CARD ━━━
function StatCard({ label, value, icon, color, darkMode }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = darkMode ? '#1e1e2e' : '#ffffff';
  const txt = darkMode ? '#f1f5f9' : '#0f172a';
  const sub = darkMode ? '#94a3b8' : '#64748b';

  return (
    <Pressable
      onPressIn={() => { scale.value = withTiming(0.95, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 200 }); }}
      style={{ width: '48%' }}
    >
      <Animated.View style={[{
        backgroundColor: bg, borderRadius: 22, padding: 20,
        elevation: 6, shadowColor: color, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12,
        borderLeftWidth: 4, borderLeftColor: color,
      }, animStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name={icon} size={18} color={color} />
          <Text style={{ color: sub, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 30, fontWeight: '900', color: txt, letterSpacing: -1 }}>{value}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { darkMode } = useContext(ThemeContext);

  const [stats, setStats] = useState({ total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0 });
  const [reminderMessages, setReminderMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bg = darkMode ? '#0f0f14' : '#f8fafc';
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const txt = darkMode ? '#f1f5f9' : '#0f172a';
  const sub = darkMode ? '#64748b' : '#94a3b8';

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
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 90, height: 90, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, marginBottom: 20 }}>
          <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 70, height: 70, borderRadius: 16 }} resizeMode="contain" />
        </View>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} colors={[C.accent]} />}
      >

        {/* ━━━ HEADER ━━━ */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, marginRight: 12 }}>
            <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 34, height: 34, borderRadius: 8 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: txt, letterSpacing: -0.5 }}>Dashboard</Text>
              <LivePulse />
            </View>
            <Text style={{ color: sub, fontSize: 13, fontWeight: '500', marginTop: 2 }}>Welcome back to Walleto</Text>
          </View>
        </View>

        {/* ━━━ STAT CARDS ━━━ */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <StatCard label="Total Messages" value={stats.total} icon="chatbubbles" color={C.accent} darkMode={darkMode} />
          <StatCard label="Orders" value={stats.orders} icon="cart" color={C.emerald} darkMode={darkMode} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <StatCard label="Complaints" value={stats.complaints} icon="alert-circle" color={C.amber} darkMode={darkMode} />
          <StatCard label="Inquiries" value={stats.inquiries} icon="help-circle" color={C.blue} darkMode={darkMode} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <StatCard label="Feedback" value={stats.feedback} icon="star" color={C.purple} darkMode={darkMode} />
          <StatCard label="Reminders" value={reminderMessages.length} icon="alarm" color={C.red} darkMode={darkMode} />
        </View>

        {/* ━━━ REMINDERS SECTION ━━━ */}
        <View style={{ marginTop: 16, marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: txt, letterSpacing: -0.3 }}>
            ⚠️ Action Required
          </Text>
          <View style={{ height: 3, width: 40, backgroundColor: C.red, borderRadius: 2, marginTop: 6 }} />
        </View>

        {reminderMessages.length === 0 ? (
          <View style={{
            backgroundColor: cardBg, borderRadius: 20, padding: 30,
            alignItems: 'center', elevation: 2, shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
          }}>
            <Ionicons name="checkmark-circle" size={40} color={C.emerald} />
            <Text style={{ color: txt, fontWeight: '700', fontSize: 15, marginTop: 10 }}>All caught up!</Text>
            <Text style={{ color: sub, fontSize: 13, marginTop: 4 }}>No pending messages older than 4 days.</Text>
          </View>
        ) : (
          reminderMessages.map((msg) => {
            const timeToUse = msg.statusUpdatedAt || msg.timestamp;
            const daysOld = Math.floor((new Date().getTime() - new Date(timeToUse).getTime()) / (1000 * 60 * 60 * 24));
            return (
              <View key={msg.id} style={{
                backgroundColor: cardBg, borderRadius: 18, padding: 16, marginBottom: 12,
                flexDirection: 'row', alignItems: 'center',
                elevation: 4, shadowColor: C.red, shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.1, shadowRadius: 8,
                borderLeftWidth: 4, borderLeftColor: C.red,
              }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                    <View style={{ backgroundColor: C.red + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: C.red, fontSize: 10, fontWeight: '800' }}>{msg.category.toUpperCase()}</Text>
                    </View>
                    <View style={{ backgroundColor: darkMode ? '#334155' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: sub, fontSize: 10, fontWeight: '700' }}>{msg.status || 'Pending'}</Text>
                    </View>
                  </View>
                  <Text style={{ color: txt, fontWeight: '600', fontSize: 14, marginBottom: 4 }} numberOfLines={1}>{msg.message}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: sub, fontSize: 12 }}>{msg.name} · {new Date(msg.timestamp).toLocaleDateString()}</Text>
                    <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>⚠️ {daysOld}d late</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginLeft: 12 }}
                  onPress={() => router.push({ pathname: '/messages', params: { customerFrom: msg.from } })}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Address</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}