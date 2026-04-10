import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages, updateMessageStatus } from '../services/api';

// ━━━ COLOR SYSTEM ━━━
const C = {
  accent:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  red:     '#ef4444',
  purple:  '#8b5cf6',
  slate:   '#64748b',
};

type MessageItem = {
  id: string; from: string; name: string; message: string;
  category: string; status: string; timestamp: string; confidence?: number;
};

type CustomerGroup = {
  from: string; name: string; messages: MessageItem[];
  counts: { [key: string]: number };
};

export default function MessagesScreen() {
  const { darkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [selectedCustomerFrom, setSelectedCustomerFrom] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Needs Action' | 'In Progress' | 'Done'>('All');
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.customerFrom) setSelectedCustomerFrom(params.customerFrom as string);
  }, [params.customerFrom]);

  const bg = darkMode ? '#0f0f14' : '#f8fafc';
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const txt = darkMode ? '#f1f5f9' : '#0f172a';
  const sub = darkMode ? '#64748b' : '#94a3b8';
  const border = darkMode ? '#2d2d40' : '#e2e8f0';

  const selectedCustomer = useMemo(() =>
    customers.find(c => c.from === selectedCustomerFrom) || null
  , [customers, selectedCustomerFrom]);

  const groupMessagesByCustomer = (messages: MessageItem[]) => {
    const groups: { [key: string]: CustomerGroup } = {};
    messages.forEach((msg) => {
      const key = msg.from;
      if (!groups[key]) { groups[key] = { from: msg.from, name: msg.name || 'Unknown', messages: [], counts: {} }; }
      groups[key].messages.push(msg);
      const cat = msg.category ? msg.category.toLowerCase() : 'others';
      groups[key].counts[cat] = (groups[key].counts[cat] || 0) + 1;
    });
    return Object.values(groups).sort((a, b) =>
      new Date(b.messages[0].timestamp).getTime() - new Date(a.messages[0].timestamp).getTime()
    );
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getMessages();
      setCustomers(groupMessagesByCustomer(data));
    } catch (err) { console.log('Error fetching messages:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStatusUpdate = async (msgId: string, currentStatus: string, category: string) => {
    const normalizedStatus = currentStatus.toLowerCase();
    const cat = category.toLowerCase();
    let nextStatus = currentStatus;
    if (cat === 'orders' || cat === 'order') {
      nextStatus = normalizedStatus === 'pending' ? 'In Progress' : normalizedStatus === 'in progress' ? 'Completed' : 'Pending';
    } else if (cat === 'complaints' || cat === 'complaint') {
      nextStatus = normalizedStatus === 'open' ? 'Resolved' : 'Open';
    } else if (cat === 'inquiries' || cat === 'inquiry') {
      nextStatus = normalizedStatus === 'not answered' ? 'Answered' : 'Not Answered';
    } else { return; }

    setCustomers(prev => prev.map(customer =>
      customer.messages.some(m => m.id === msgId)
        ? { ...customer, messages: customer.messages.map(m => m.id === msgId ? { ...m, status: nextStatus } : m) }
        : customer
    ));

    try { await updateMessageStatus(msgId, nextStatus); setTimeout(() => fetchData(true), 500); }
    catch (err) { console.log('Error updating status:', err); fetchData(true); }
  };

  const getCatMeta = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('order'))     return { icon: 'cart' as const, color: C.emerald, label: 'ORDER' };
    if (cat.includes('inquiry'))   return { icon: 'help-circle' as const, color: C.blue, label: 'INQUIRY' };
    if (cat.includes('complaint')) return { icon: 'alert-circle' as const, color: C.red, label: 'COMPLAINT' };
    if (cat.includes('feedback'))  return { icon: 'star' as const, color: C.amber, label: 'FEEDBACK' };
    if (cat.includes('invalid'))   return { icon: 'close-circle' as const, color: C.slate, label: 'INVALID' };
    return { icon: 'chatbubble' as const, color: C.slate, label: 'OTHER' };
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'resolved' || s === 'answered') return C.emerald;
    if (s === 'in progress') return C.amber;
    return C.slate;
  };

  const filteredMessages = useMemo(() => {
    if (!selectedCustomer) return [];
    let msgs = [...selectedCustomer.messages];
    msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 70, height: 70, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, marginBottom: 16 }}>
          <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 52, height: 52, borderRadius: 12 }} resizeMode="contain" />
        </View>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {selectedCustomerFrom ? (
        /* ━━━ CHAT VIEW ━━━ */
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: border,
            backgroundColor: cardBg,
          }}>
            <TouchableOpacity
              onPress={() => { setSelectedCustomerFrom(null); setShowCompleted(false); }}
              style={{ padding: 8, marginRight: 10, borderRadius: 12, backgroundColor: darkMode ? '#16162a' : '#f1f5f9' }}
            >
              <Ionicons name="arrow-back" size={22} color={txt} />
            </TouchableOpacity>
            <View style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: C.accent,
              justifyContent: 'center', alignItems: 'center', marginRight: 12,
            }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                {selectedCustomer?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: txt }}>{selectedCustomer?.name || 'Loading...'}</Text>
              <Text style={{ fontSize: 12, color: sub, fontWeight: '500' }}>{selectedCustomerFrom}</Text>
            </View>
          </View>

          {/* Filter Bar */}
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {(['All', 'Needs Action', 'In Progress', 'Done'] as const).map((status) => {
                const isActive = statusFilter === status;
                return (
                  <TouchableOpacity
                    key={status} onPress={() => setStatusFilter(status)}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14,
                      backgroundColor: isActive ? C.accent : (darkMode ? '#1e1e2e' : '#f8fafc'),
                      borderWidth: isActive ? 0 : 1, borderColor: border,
                    }}
                  >
                    <Text style={{ color: isActive ? '#fff' : sub, fontSize: 13, fontWeight: '700' }}>{status}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Messages */}
          <ScrollView
            style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={C.accent} />}
          >
            {filteredMessages.map((msg) => {
              const catMeta = getCatMeta(msg.category);
              const statusColor = getStatusColor(msg.status || 'Pending');
              return (
                <View key={msg.id} style={{
                  backgroundColor: cardBg, borderRadius: 18, padding: 16, marginBottom: 12,
                  elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06, shadowRadius: 6,
                  borderLeftWidth: 3, borderLeftColor: catMeta.color,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ backgroundColor: catMeta.color + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name={catMeta.icon} size={12} color={catMeta.color} />
                        <Text style={{ color: catMeta.color, fontSize: 10, fontWeight: '800' }}>{catMeta.label}</Text>
                      </View>
                      {!['feedback', 'invalid'].includes(msg.category.toLowerCase()) && (
                        <TouchableOpacity
                          onPress={() => handleStatusUpdate(msg.id, msg.status || '', msg.category)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: statusColor + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
                        >
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
                          <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>{msg.status || 'Pending'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={{ color: sub, fontSize: 11, fontWeight: '500' }}>
                      {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={{ color: txt, fontSize: 15, lineHeight: 22, fontWeight: '500' }}>{msg.message}</Text>
                </View>
              );
            })}

            {filteredMessages.length === 0 && (
              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Ionicons name="filter-outline" size={40} color={sub} />
                <Text style={{ color: txt, fontWeight: '700', marginTop: 10 }}>No {statusFilter.toLowerCase()} messages</Text>
                <Text style={{ color: sub, fontSize: 13, marginTop: 4 }}>Try changing the filter above</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        /* ━━━ CUSTOMER LIST ━━━ */
        <ScrollView
          style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={C.accent} />}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, marginRight: 10 }}>
              <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 34, height: 34, borderRadius: 8 }} resizeMode="contain" />
            </View>
            <View>
              <Text style={{ fontSize: 26, fontWeight: '900', color: txt, letterSpacing: -0.5 }}>Messages</Text>
              <Text style={{ color: sub, fontSize: 13, fontWeight: '500', marginTop: 2 }}>{customers.length} conversations</Text>
            </View>
          </View>

          {customers.length === 0 ? (
            <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 40, alignItems: 'center', elevation: 2 }}>
              <Ionicons name="chatbubbles-outline" size={50} color={sub} />
              <Text style={{ color: txt, fontWeight: '700', fontSize: 16, marginTop: 12 }}>No conversations yet</Text>
              <Text style={{ color: sub, fontSize: 13, marginTop: 4 }}>WhatsApp messages will appear here</Text>
            </View>
          ) : (
            customers.map((customer) => (
              <Pressable
                key={customer.from}
                onPress={() => setSelectedCustomerFrom(customer.from)}
                style={{
                  backgroundColor: cardBg, borderRadius: 20, padding: 16, marginBottom: 12,
                  flexDirection: 'row', alignItems: 'center',
                  elevation: 4, shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
                }}
              >
                {/* Avatar */}
                <View style={{
                  width: 48, height: 48, borderRadius: 16,
                  backgroundColor: C.accent,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
                    {customer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: txt }}>{customer.name}</Text>
                  <Text style={{ fontSize: 12, color: sub, marginTop: 2 }}>{customer.from}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(customer.counts).map(([cat, count]) => {
                      const meta = getCatMeta(cat);
                      return (
                        <View key={cat} style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: meta.color + '12', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                        }}>
                          <Ionicons name={meta.icon} size={12} color={meta.color} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: meta.color }}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: sub, fontWeight: '500' }}>
                    {new Date(customer.messages[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={{
                    marginTop: 6, width: 28, height: 28, borderRadius: 10,
                    backgroundColor: darkMode ? '#16162a' : '#f1f5f9',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons name="chevron-forward" size={16} color={sub} />
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
