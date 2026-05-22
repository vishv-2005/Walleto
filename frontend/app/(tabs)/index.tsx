import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  FadeInDown, FadeInRight, withRepeat, withSequence,
  Easing, interpolate, withDelay,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStats, getMessages, getUnreadNotificationCount, getStoredUser, getProfile } from '../services/api';

const { width: W } = Dimensions.get('window');

type MessageItem = {
  id: string; from: string; message: string; category: string;
  name: string; timestamp: string; status?: string; statusUpdatedAt?: string;
};

// ── Floating Orb ─────────────────────────────────────
function FloatingOrb({ color, size, startX, startY, duration, delay: d }: any) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
      ), -1
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 0.5, 1], [0, 25, -15]) },
      { translateY: interpolate(progress.value, [0, 0.5, 1], [0, -35, 15]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.12, 0.92]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 0.8, 0.5]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute', left: startX, top: startY,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
    }, style]} />
  );
}

// ── Animated Counter ─────────────────────────────────
function AnimatedNumber({ value, color, size = 28 }: { value: number; color: string; size?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startTime = Date.now();
    const duration = 800;
    const startVal = display;
    const endVal = value;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [value]);
  return <Text style={{ fontSize: size, fontWeight: '800', color, letterSpacing: -1 }}>{display}</Text>;
}

const STAT_CARDS = [
  { key: 'total', label: 'Total Messages', icon: 'chatbubbles', color: '#6366F1' },
  { key: 'orders', label: 'Orders', icon: 'cart', color: '#22C55E' },
  { key: 'complaints', label: 'Complaints', icon: 'alert-circle', color: '#EF4444' },
  { key: 'inquiries', label: 'Inquiries', icon: 'help-circle', color: '#3B82F6' },
  { key: 'feedback', label: 'Feedback', icon: 'star', color: '#F59E0B' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { darkMode, t } = useContext(ThemeContext);
  const [stats, setStats] = useState<any>({ total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0 });
  const [reminderMessages, setReminderMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getStoredUser();
      if (user?.email) {
        try {
          const profileData = await getProfile(user.email);
          setUserName(profileData.name || profileData.businessName || '');
        } catch {
          setUserName(user.name || user.businessName || '');
        }
      }
    };
    fetchUser();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchData = useCallback(async () => {
    try {
      const [statsData, messagesData, unreadData] = await Promise.all([
        getStats(), getMessages(), getUnreadNotificationCount().catch(() => ({ count: 0 })),
      ]);
      setStats(statsData);
      setUnreadCount(unreadData.count || 0);
      const now = Date.now();
      const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
      const reminders = messagesData.filter((msg: MessageItem) => {
        const timeToUse = msg.statusUpdatedAt || msg.timestamp;
        const isOld = (now - new Date(timeToUse).getTime()) >= FOUR_DAYS_MS;
        const cat = msg.category ? msg.category.toLowerCase() : '';
        if (cat === 'feedback' || cat === 'invalid' || cat === 'irrelevant') return false;
        const s = msg.status ? msg.status.toLowerCase() : 'pending';
        const isPending = !(s === 'completed' || s === 'resolved' || s === 'answered');
        return isOld && isPending;
      });
      reminders.sort((a: MessageItem, b: MessageItem) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setReminderMessages(reminders);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Live Animated Background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <FloatingOrb color={t.orb1} size={260} startX={-60} startY={50} duration={9000} delay={0} />
        <FloatingOrb color={t.orb2} size={200} startX={W * 0.55} startY={300} duration={11000} delay={3000} />
        <FloatingOrb color={t.orb3} size={160} startX={W * 0.1} startY={600} duration={8000} delay={5000} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={t.primary} />}
      >
        {/* Greeting Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()}
          style={[st.greetingCard, {
            backgroundColor: darkMode ? 'rgba(37,211,102,0.06)' : 'rgba(37,211,102,0.06)',
            borderColor: darkMode ? 'rgba(37,211,102,0.10)' : 'rgba(37,211,102,0.12)',
          }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[st.greeting, { color: t.subText }]}>{getGreeting()}</Text>
            <Text style={[st.greetingName, { color: t.text }]}>{userName || 'Business Owner'} 👋</Text>
            <Text style={[st.greetingDesc, { color: t.subText }]}>
              {stats.total > 0
                ? `You have ${stats.total} total messages and ${reminderMessages.length} pending actions.`
                : 'No messages yet. Connect WhatsApp to get started.'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => router.push('/modal')} style={st.notifBubble}>
              <Ionicons name="notifications" size={16} color="#fff" />
              <Text style={st.notifBubbleText}>{unreadCount}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Stat Cards Grid */}
        <View style={st.statsGrid}>
          {STAT_CARDS.map((s, i) => {
            const value = stats[s.key] || 0;
            return (
              <Animated.View
                key={s.key}
                entering={FadeInDown.delay(100 + i * 60).springify()}
                style={[st.statCard, {
                  backgroundColor: t.card,
                  borderColor: t.border,
                  width: i === 0 ? '100%' : '48%',
                  shadowColor: t.shadow,
                }]}
              >
                <View style={[st.statIconWrap, { backgroundColor: `${s.color}12` }]}>
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={[st.statLabel, { color: t.subText }]}>{s.label}</Text>
                <AnimatedNumber value={value} color={s.color} size={i === 0 ? 36 : 28} />
              </Animated.View>
            );
          })}
        </View>


        {/* Reminders */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={{ paddingHorizontal: 20 }}>
          <Text style={[st.sectionTitle, { color: reminderMessages.length > 0 ? t.error : t.text }]}>
            {reminderMessages.length > 0 ? `⚠️ ${reminderMessages.length} Actions Required` : '✅ All Caught Up'}
          </Text>

          {reminderMessages.length === 0 ? (
            <View style={[st.emptyReminder, { backgroundColor: t.card, borderColor: t.border }]}>
              <Ionicons name="checkmark-circle" size={40} color={t.success} />
              <Text style={[st.emptyText, { color: t.subText }]}>No pending messages older than 4 days.</Text>
            </View>
          ) : (
            reminderMessages.slice(0, 5).map((msg, index) => {
              const daysOld = Math.floor((Date.now() - new Date(msg.statusUpdatedAt || msg.timestamp).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Animated.View key={msg.id} entering={FadeInRight.delay(index * 60).springify()}>
                  <View style={[st.reminderCard, { backgroundColor: t.card, borderColor: t.border }]}>
                    <View style={st.reminderLeft}>
                      <View style={st.reminderBadges}>
                        <View style={[st.catBadge, { backgroundColor: `${t.error}15` }]}>
                          <Text style={{ color: t.error, fontSize: 10, fontWeight: '700' }}>{msg.category?.toUpperCase()}</Text>
                        </View>
                        <View style={[st.statusBadge, { backgroundColor: t.cardAlt }]}>
                          <Text style={[st.statusText, { color: t.subText }]}>{msg.status || 'Pending'}</Text>
                        </View>
                      </View>
                      <Text style={[st.reminderMsg, { color: t.text }]} numberOfLines={1}>{msg.message}</Text>
                      <View style={st.reminderMeta}>
                        <Text style={[st.reminderFrom, { color: t.subText }]}>{msg.name}</Text>
                        <Text style={{ fontSize: 11, color: t.error, fontWeight: '700' }}>🔴 {daysOld}d late</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7} style={st.addressBtn}
                      onPress={() => router.push({ pathname: '/messages' as any, params: { customerFrom: msg.from } })}
                    >
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  greetingCard: {
    marginHorizontal: 20, marginTop: 8, marginBottom: 16,
    padding: 22, borderRadius: 20, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
  },
  greeting: { fontSize: 13, fontWeight: '500', letterSpacing: 0.5 },
  greetingName: { fontSize: 26, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  greetingDesc: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  notifBubble: {
    backgroundColor: '#25D366', borderRadius: 16, paddingHorizontal: 12,
    paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  notifBubbleText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20,
    gap: 10, justifyContent: 'space-between',
  },
  statCard: {
    padding: 18, borderRadius: 16, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3 },

  quickActions: { marginTop: 20, marginBottom: 10 },
  quickAction: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 16, borderWidth: 1, minWidth: 95,
  },
  quickActionIcon: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  quickActionLabel: { fontSize: 11, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3, paddingHorizontal: 0 },

  emptyReminder: {
    padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1,
  },
  emptyText: { fontSize: 14, marginTop: 10, textAlign: 'center' },

  reminderCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  reminderLeft: { flex: 1 },
  reminderBadges: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '600' },
  reminderMsg: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  reminderMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderFrom: { fontSize: 12 },
  addressBtn: {
    backgroundColor: '#EF4444', width: 38, height: 38,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
});