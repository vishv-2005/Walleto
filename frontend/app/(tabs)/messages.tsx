import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages, updateMessageStatus } from '../services/api';

type MessageItem = {
  id: string;
  from: string;
  name: string;
  message: string;
  category: string;
  status: string;
  timestamp: string;
  confidence?: number;
};

type CustomerGroup = {
  from: string;
  name: string;
  messages: MessageItem[];
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
    if (params.customerFrom) {
      setSelectedCustomerFrom(params.customerFrom as string);
    }
  }, [params.customerFrom]);

  const bg = darkMode ? '#0f0f0f' : '#f5f7fa';
  const card = darkMode ? '#1c1c1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';
  const subText = darkMode ? '#9ca3af' : '#6b7280';
  const border = darkMode ? '#2d2d2d' : '#e5e7eb';

  // State-derived selected customer to avoid closure staleness
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.from === selectedCustomerFrom) || null
  , [customers, selectedCustomerFrom]);

  const groupMessagesByCustomer = (messages: MessageItem[]) => {
    const groups: { [key: string]: CustomerGroup } = {};
    
    messages.forEach((msg) => {
      const key = msg.from;
      if (!groups[key]) {
        groups[key] = {
          from: msg.from,
          name: msg.name || 'Unknown',
          messages: [],
          counts: {},
        };
      }
      groups[key].messages.push(msg);
      
      const cat = msg.category ? msg.category.toLowerCase() : 'others';
      groups[key].counts[cat] = (groups[key].counts[cat] || 0) + 1;
    });

    return Object.values(groups).sort((a, b) => {
      const timeA = new Date(a.messages[0].timestamp).getTime();
      const timeB = new Date(b.messages[0].timestamp).getTime();
      return timeB - timeA;
    });
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getMessages();
      const grouped = groupMessagesByCustomer(data);
      setCustomers(grouped);
    } catch (err) {
      console.log('Error fetching messages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleStatusUpdate = async (msgId: string, currentStatus: string, category: string) => {
    // Normalize case for comparison
    const normalizedStatus = currentStatus.toLowerCase();
    const cat = category.toLowerCase();
    
    let nextStatus = currentStatus;
    
    if (cat === 'orders' || cat === 'order') {
      nextStatus = normalizedStatus === 'pending' ? 'In Progress' : 
                   normalizedStatus === 'in progress' ? 'Completed' : 'Pending';
    } else if (cat === 'complaints' || cat === 'complaint') {
      nextStatus = normalizedStatus === 'open' ? 'Resolved' : 'Open';
    } else if (cat === 'inquiries' || cat === 'inquiry') {
      nextStatus = normalizedStatus === 'not answered' ? 'Answered' : 'Not Answered';
    } else {
      return; // no status for feedback/invalid
    }
    
    // Optimistic UI update: update local state instantly
    setCustomers(prevCustomers => {
      return prevCustomers.map(customer => {
        if (customer.messages.some(m => m.id === msgId)) {
          return {
            ...customer,
            messages: customer.messages.map(m => 
              m.id === msgId ? { ...m, status: nextStatus } : m
            )
          };
        }
        return customer;
      });
    });

    try {
      await updateMessageStatus(msgId, nextStatus);
      // Silent refresh to sync with server's source of truth
      setTimeout(() => fetchData(true), 500);
    } catch (err) {
      console.log('Error updating status:', err);
      // Revert on error
      fetchData(true);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('order')) return { name: 'cart' as const, color: '#22c55e' };
    if (cat.includes('inquiry')) return { name: 'help-circle' as const, color: '#3b82f6' };
    if (cat.includes('complaint')) return { name: 'alert-circle' as const, color: '#ef4444' };
    if (cat.includes('feedback')) return { name: 'star' as const, color: '#f59e0b' };
    if (cat.includes('invalid')) return { name: 'close-circle' as const, color: '#9ca3af' };
    return { name: 'chatbubble' as const, color: '#9ca3af' };
  };

  const filteredMessages = useMemo(() => {
    if (!selectedCustomer) return [];
    
    let msgs = [...selectedCustomer.messages];
    
    // Always sort by timestamp descending (most recent first)
    msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply status filter
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
        <ActivityIndicator size="large" color="#22c55e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {selectedCustomerFrom ? (
        // Chat View
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { borderBottomColor: border }]}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                setSelectedCustomerFrom(null);
                setShowCompleted(false);
              }} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={26} color={text} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: text }]}>{selectedCustomer?.name || 'Loading...'}</Text>
              <Text style={[styles.headerSub, { color: subText }]}>{selectedCustomerFrom}</Text>
            </View>
          </View>

          {/* Status Filter Bar */}
          <View style={[styles.filterBar, { borderBottomColor: border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['All', 'Needs Action', 'In Progress', 'Done'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.7}
                  onPress={() => setStatusFilter(status)}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: statusFilter === status ? '#22c55e' : (darkMode ? '#1c1c1e' : '#f3f4f6'),
                      borderColor: statusFilter === status ? '#22c55e' : border
                    }
                  ]}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: statusFilter === status ? '#fff' : subText }
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
          >
            {/* Filtered Messages */}
            {filteredMessages.map((msg) => (
              <View key={msg.id} style={[styles.chatCard, { backgroundColor: card }]}>
                <View style={styles.chatTop}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.catBadge, { backgroundColor: getCategoryIcon(msg.category).color + '20' }]}>
                      <Text style={{ color: getCategoryIcon(msg.category).color, fontSize: 10, fontWeight: '700' }}>
                        {msg.category.toUpperCase()}
                      </Text>
                    </View>
                    {!['feedback', 'invalid'].includes(msg.category.toLowerCase()) && (
                      <TouchableOpacity 
                        activeOpacity={0.6}
                        onPress={() => handleStatusUpdate(msg.id, msg.status || '', msg.category)}
                        style={[styles.statusBadge, { borderColor: (msg.status === 'Completed' || msg.status === 'Resolved' || msg.status === 'Answered' ? '#22c55e' : msg.status === 'In Progress' ? '#f59e0b' : '#9ca3af') }]}
                      >
                        <Text style={{ color: (msg.status === 'Completed' || msg.status === 'Resolved' || msg.status === 'Answered' ? '#22c55e' : msg.status === 'In Progress' ? '#f59e0b' : '#9ca3af'), fontSize: 10, fontWeight: '700' }}>
                          {msg.status || 'Pending'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.chatDate, { color: subText }]}>
                    {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={[styles.chatText, { color: text }]}>{msg.message}</Text>
              </View>
            ))}

            {filteredMessages.length === 0 && (
              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Ionicons name="filter-outline" size={40} color={subText} />
                <Text style={{ color: subText, marginTop: 10 }}>No {statusFilter.toLowerCase()} messages</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        // Customer List View
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        >
          <Text style={[styles.title, { color: text }]}>Messages</Text>
          
          {customers.length === 0 ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={60} color={subText} />
              <Text style={{ color: subText, marginTop: 15, fontSize: 16 }}>No activity yet</Text>
            </View>
          ) : (
            customers.map((customer) => (
              <TouchableOpacity 
                activeOpacity={0.7}
                key={customer.from} 
                style={[styles.customerCard, { backgroundColor: card }]}
                onPress={() => setSelectedCustomerFrom(customer.from)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                </View>
                
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.customerName, { color: text }]}>{customer.name}</Text>
                  <Text style={[styles.customerNumber, { color: subText }]}>{customer.from}</Text>
                  
                  <View style={styles.summaryStack}>
                    {Object.entries(customer.counts).map(([cat, count]) => {
                      const icon = getCategoryIcon(cat);
                      return (
                        <View key={cat} style={styles.summaryItem}>
                          <Ionicons name={icon.name} size={14} color={icon.color} />
                          <Text style={[styles.summaryCount, { color: text }]}>{count}</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.lastTime, { color: subText }]}>
                    {new Date(customer.messages[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={subText} style={{ marginTop: 5 }} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  customerCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  customerName: { fontSize: 17, fontWeight: '600' },
  customerNumber: { fontSize: 13, marginTop: 2 },
  summaryStack: { flexDirection: 'row', marginTop: 8, gap: 10 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  summaryCount: { fontSize: 11, fontWeight: '600' },
  lastTime: { fontSize: 12 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: { padding: 10, marginRight: 10, borderRadius: 20 },
  headerTitle: { fontSize: 19, fontWeight: 'bold' },
  headerSub: { fontSize: 12, opacity: 0.7 },
  
  chatCard: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1,
  },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  chatDate: { fontSize: 11 },
  chatText: { fontSize: 15, lineHeight: 22 },

  aggrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  aggrTitle: { fontSize: 15, fontWeight: '600' },
  
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 15,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
