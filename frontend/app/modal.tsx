import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOutLeft, SlideInRight, Layout } from 'react-native-reanimated';
import { ThemeContext } from './context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, deleteAllNotifications,
} from './services/api';

type NotificationItem = {
  id: string; type: string; title: string; body: string;
  icon: string; read: boolean; priority: string; createdAt: string; data?: any;
};

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'order_update', label: 'Orders', icon: 'cart' },
  { key: 'complaint_alert', label: 'Complaints', icon: 'alert-circle' },
  { key: 'new_message', label: 'Messages', icon: 'chatbubble' },
  { key: 'reminder', label: 'Reminders', icon: 'alarm' },
  { key: 'login', label: 'Login', icon: 'log-in' },
  { key: 'status_change', label: 'Status', icon: 'checkmark-circle' },
  { key: 'system', label: 'System', icon: 'settings' },
];

const PRIORITY_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' };
const TYPE_COLORS: Record<string, string> = {
  order_update: '#22C55E', complaint_alert: '#EF4444', new_message: '#3B82F6',
  reminder: '#F59E0B', login: '#8B5CF6', status_change: '#06B6D4', system: '#64748B',
};

export default function NotificationCenter() {
  const router = useRouter();
  const { darkMode, t } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const filters: any = { limit: 100 };
      if (activeFilter !== 'all') filters.type = activeFilter;
      setNotifications(await getNotifications(filters));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeFilter]);

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 5000); return () => clearInterval(interval); }, [fetchData]);

  const handleMarkRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markNotificationRead(id).catch(() => { });
  };
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsRead().catch(() => { });
  };
  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteNotification(id).catch(() => { });
  };
  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => { setNotifications([]); await deleteAllNotifications().catch(() => { }); } },
    ]);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <SafeAreaView style={[st.container, { backgroundColor: t.bg }]}><ActivityIndicator size="large" color={t.primary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[st.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[st.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={handleBack} style={st.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: t.text }]}>Notifications</Text>
          {unreadCount > 0 && <Text style={[st.headerSub, { color: t.primary }]}>{unreadCount} unread</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={[st.actionBtn, { backgroundColor: t.primaryGhost }]}>
              <Ionicons name="checkmark-done" size={16} color={t.primary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={[st.actionBtn, { backgroundColor: t.errorLight }]}>
              <Ionicons name="trash-outline" size={16} color={t.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.filterRow}
        style={{ maxHeight: 50, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)}
            style={[st.filterChip, {
              backgroundColor: activeFilter === f.key ? (TYPE_COLORS[f.key] || t.primary) : t.cardAlt,
              borderColor: activeFilter === f.key ? 'transparent' : t.border,
            }]}>
            <Ionicons name={f.icon as any} size={13} color={activeFilter === f.key ? '#fff' : t.subText} />
            <Text style={[st.filterText, { color: activeFilter === f.key ? '#fff' : t.subText }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={t.primary} />}>
        {notifications.length === 0 ? (
          <View style={st.emptyState}>
            <View style={[st.emptyIcon, { backgroundColor: t.cardAlt }]}>
              <Ionicons name="notifications-off-outline" size={40} color={t.muted} />
            </View>
            <Text style={[st.emptyTitle, { color: t.text }]}>No notifications</Text>
            <Text style={[st.emptyDesc, { color: t.subText }]}>
              You're all caught up! Notifications will appear here when you receive messages, orders, or alerts.
            </Text>
          </View>
        ) : (
          notifications.map((notif, index) => {
            const typeColor = TYPE_COLORS[notif.type] || '#64748B';
            const priorityColor = PRIORITY_COLORS[notif.priority] || t.success;
            return (
              <Animated.View key={notif.id} entering={FadeInDown.delay(index * 40).springify()}
                exiting={FadeOutLeft.duration(200)} layout={Layout.springify()}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleMarkRead(notif.id)}
                  style={[st.notifCard, {
                    backgroundColor: notif.read ? t.card : (darkMode ? '#0F1A0F' : '#F0FDF4'),
                    borderColor: notif.read ? t.border : `${typeColor}30`,
                    borderLeftColor: typeColor,
                  }]}>
                  <View style={[st.notifIconWrap, { backgroundColor: `${typeColor}18` }]}>
                    <Ionicons name={(notif.icon || 'notifications') as any} size={20} color={typeColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={st.notifTopRow}>
                      <Text style={[st.notifTitle, { color: t.text, fontWeight: notif.read ? '500' : '700' }]} numberOfLines={1}>{notif.title}</Text>
                      {notif.priority === 'high' && <View style={[st.priorityDot, { backgroundColor: priorityColor }]} />}
                    </View>
                    <Text style={[st.notifBody, { color: t.textSecondary }]} numberOfLines={2}>{notif.body}</Text>
                    <View style={st.notifMeta}>
                      <View style={[st.typeBadge, { backgroundColor: `${typeColor}15` }]}>
                        <Text style={[st.typeText, { color: typeColor }]}>{notif.type.replace(/_/g, ' ')}</Text>
                      </View>
                      <Text style={[st.timeText, { color: t.muted }]}>{getTimeAgo(notif.createdAt)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(notif.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={st.deleteBtn}>
                    <Ionicons name="close" size={16} color={t.muted} />
                  </TouchableOpacity>
                  {!notif.read && <View style={[st.unreadDot, { backgroundColor: typeColor }]} />}
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backBtn: { padding: 8, marginRight: 8, borderRadius: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  actionBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 40 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14,
    borderRadius: 14, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3, position: 'relative',
  },
  notifIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  notifTitle: { fontSize: 14, flex: 1 },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  timeText: { fontSize: 11 },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  deleteBtn: { padding: 4, marginLeft: 4 },
  unreadDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4 },
});
