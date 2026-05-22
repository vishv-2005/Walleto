import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { getMessages, updateMessageStatus } from '../services/api';

type MessageItem = {
  id: string; from: string; name: string; message: string;
  category: string; status: string; timestamp: string; confidence?: number;
};
type CustomerGroup = {
  from: string; name: string; messages: MessageItem[];
  counts: { [key: string]: number };
};

const CAT_ICONS: Record<string, string> = {
  order: 'cart', orders: 'cart', complaint: 'alert-circle', complaints: 'alert-circle',
  inquiry: 'help-circle', inquiries: 'help-circle', feedback: 'star', invalid: 'close-circle',
};

export default function MessagesScreen() {
  const { darkMode, t } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [selectedCustomerFrom, setSelectedCustomerFrom] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Needs Action' | 'In Progress' | 'Done'>('All');
  const params = useLocalSearchParams();

  useEffect(() => { if (params.customerFrom) setSelectedCustomerFrom(params.customerFrom as string); }, [params.customerFrom]);

  const selectedCustomer = useMemo(() => customers.find(c => c.from === selectedCustomerFrom) || null, [customers, selectedCustomerFrom]);

  const catColor = (cat: string) => {
    const c = cat?.toLowerCase();
    if (c?.includes('order')) return t.order;
    if (c?.includes('complaint')) return t.complaint;
    if (c?.includes('inquir')) return t.inquiry;
    if (c === 'feedback') return t.feedback;
    return t.invalid;
  };

  const groupMessagesByCustomer = (messages: MessageItem[]) => {
    const groups: { [key: string]: CustomerGroup } = {};
    messages.forEach((msg) => {
      const key = msg.from;
      if (!groups[key]) groups[key] = { from: msg.from, name: msg.name || 'Unknown', messages: [], counts: {} };
      groups[key].messages.push(msg);
      const cat = msg.category ? msg.category.toLowerCase() : 'others';
      groups[key].counts[cat] = (groups[key].counts[cat] || 0) + 1;
    });
    return Object.values(groups).sort((a, b) => new Date(b.messages[0].timestamp).getTime() - new Date(a.messages[0].timestamp).getTime());
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try { setCustomers(groupMessagesByCustomer(await getMessages())); }
    catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const interval = setInterval(() => fetchData(true), 2000); return () => clearInterval(interval); }, [fetchData]);

  const handleStatusUpdate = async (msgId: string, currentStatus: string, category: string) => {
    const norm = currentStatus.toLowerCase(); const cat = category.toLowerCase();
    let next = currentStatus;
    if (cat.includes('order')) next = norm === 'pending' ? 'In Progress' : norm === 'in progress' ? 'Completed' : 'Pending';
    else if (cat.includes('complaint')) next = norm === 'open' ? 'Resolved' : 'Open';
    else if (cat.includes('inquir')) next = norm === 'not answered' ? 'Answered' : 'Not Answered';
    else return;
    setCustomers(prev => prev.map(c => ({ ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, status: next } : m) })));
    try { await updateMessageStatus(msgId, next); setTimeout(() => fetchData(true), 500); } catch { fetchData(true); }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'resolved' || s === 'answered') return t.success;
    if (s === 'in progress') return '#F59E0B';
    return t.muted;
  };

  const filteredMessages = useMemo(() => {
    if (!selectedCustomer) return [];
    let msgs = [...selectedCustomer.messages].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (statusFilter !== 'All') {
      msgs = msgs.filter(m => {
        const s = (m.status || '').toLowerCase();
        if (statusFilter === 'Needs Action') return s === 'pending' || s === 'open' || s === 'not answered';
        if (statusFilter === 'In Progress') return s === 'in progress';
        if (statusFilter === 'Done') return s === 'completed' || s === 'resolved' || s === 'answered';
        return false;
      });
    }
    return msgs;
  }, [selectedCustomer, statusFilter]);

  if (loading && !refreshing && customers.length === 0) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={t.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {selectedCustomerFrom ? (
        <View style={{ flex: 1 }}>
          {/* Chat Header */}
          <View style={[st.header, { borderBottomColor: t.border, backgroundColor: t.bg }]}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedCustomerFrom(null)} style={st.backButton}>
              <Ionicons name="arrow-back" size={24} color={t.text} />
            </TouchableOpacity>
            <View style={[st.headerAvatar, { backgroundColor: t.primary }]}>
              <Text style={st.headerAvatarText}>{selectedCustomer?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.headerTitle, { color: t.text }]}>{selectedCustomer?.name || 'Loading...'}</Text>
              <Text style={[st.headerSub, { color: t.subText }]}>{selectedCustomerFrom}</Text>
            </View>
          </View>

          {/* Status Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.filterScroll}
            style={{ maxHeight: 52, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            {(['All', 'Needs Action', 'In Progress', 'Done'] as const).map(status => (
              <TouchableOpacity key={status} activeOpacity={0.7} onPress={() => setStatusFilter(status)}
                style={[st.filterChip, {
                  backgroundColor: statusFilter === status ? t.primary : t.cardAlt,
                  borderColor: statusFilter === status ? t.primary : t.border,
                }]}>
                <Text style={[st.filterChipText, { color: statusFilter === status ? '#fff' : t.subText }]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={t.primary} />}>
            {filteredMessages.map((msg, index) => {
              const cc = catColor(msg.category);
              const sc = getStatusColor(msg.status);
              const isOlderThan30Days = (Date.now() - new Date(msg.timestamp).getTime()) > 30 * 24 * 60 * 60 * 1000;
              return (
                <Animated.View key={msg.id} entering={FadeInDown.delay(index * 30).springify()} layout={Layout.springify()}>
                  <View style={[st.chatCard, { backgroundColor: t.card, borderColor: isOlderThan30Days ? t.error : t.border }]}>
                    <View style={st.chatTop}>
                      <View style={st.badgeRow}>
                        <View style={[st.catBadge, { backgroundColor: `${cc}15` }]}>
                          <Text style={{ color: cc, fontSize: 10, fontWeight: '700' }}>{msg.category?.toUpperCase()}</Text>
                        </View>
                        {!['feedback', 'invalid'].includes(msg.category?.toLowerCase()) && (
                          <TouchableOpacity activeOpacity={0.6}
                            onPress={() => handleStatusUpdate(msg.id, msg.status || '', msg.category)}
                            style={[st.statusBadge, { borderColor: sc }]}>
                            <Text style={{ color: sc, fontSize: 10, fontWeight: '700' }}>{msg.status || 'Pending'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={[st.chatDate, { color: t.muted }]}>
                        {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[st.chatText, { color: t.text }]}>{msg.message}</Text>
                  </View>
                </Animated.View>
              );
            })}
            {filteredMessages.length === 0 && (
              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Ionicons name="filter-outline" size={40} color={t.muted} />
                <Text style={{ color: t.subText, marginTop: 10 }}>No {statusFilter.toLowerCase()} messages</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={t.primary} />}>
          <Text style={[st.title, { color: t.text }]}>Messages</Text>
          {customers.length === 0 ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <View style={[st.emptyIcon, { backgroundColor: t.cardAlt }]}>
                <Ionicons name="chatbubbles-outline" size={40} color={t.muted} />
              </View>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginTop: 16 }}>No activity yet</Text>
              <Text style={{ color: t.subText, marginTop: 6, textAlign: 'center' }}>Messages will appear when customers send WhatsApp messages.</Text>
            </View>
          ) : (
            customers.map((customer, index) => (
              <Animated.View key={customer.from} entering={FadeInDown.delay(index * 40).springify()}>
                <TouchableOpacity activeOpacity={0.7}
                  style={[st.customerCard, { backgroundColor: t.card, borderColor: t.border }]}
                  onPress={() => setSelectedCustomerFrom(customer.from)}>
                  <View style={[st.avatar, { backgroundColor: catColor(Object.keys(customer.counts)[0]) }]}>
                    <Text style={st.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[st.customerName, { color: t.text }]}>{customer.name}</Text>
                    <Text style={[st.customerNumber, { color: t.subText }]}>{customer.from}</Text>
                    <View style={st.summaryStack}>
                      {Object.entries(customer.counts).map(([cat, count]) => (
                        <View key={cat} style={[st.summaryItem, { backgroundColor: `${catColor(cat)}12` }]}>
                          <Ionicons name={(CAT_ICONS[cat] || 'chatbubble') as any} size={12} color={catColor(cat)} />
                          <Text style={[st.summaryCount, { color: catColor(cat) }]}>{count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[st.lastTime, { color: t.subText }]}>
                      {new Date(customer.messages[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                    <View style={[st.arrowWrap, { backgroundColor: t.cardAlt }]}>
                      <Ionicons name="chevron-forward" size={14} color={t.subText} />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  customerCard: { flexDirection: 'row', padding: 14, borderRadius: 14, marginBottom: 10, alignItems: 'center', borderWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  customerName: { fontSize: 16, fontWeight: '600' },
  customerNumber: { fontSize: 12, marginTop: 2 },
  summaryStack: { flexDirection: 'row', marginTop: 8, gap: 8 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  summaryCount: { fontSize: 11, fontWeight: '700' },
  lastTime: { fontSize: 11 },
  arrowWrap: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  emptyIcon: { width: 70, height: 70, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5 },
  backButton: { padding: 8, marginRight: 8, borderRadius: 20 },
  headerAvatar: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 11, opacity: 0.7 },
  filterScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  chatCard: { padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  chatDate: { fontSize: 10 },
  chatText: { fontSize: 14, lineHeight: 20 },
});
