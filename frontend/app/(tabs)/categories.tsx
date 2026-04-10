import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { getCategories, addCategoryItem, updateCategoryItem, deleteCategoryItem } from '../services/api';

// ━━━ COLOR SYSTEM ━━━
const C = {
  accent:  '#6366f1',
  orders:  '#10b981',
  complaints: '#f59e0b',
  inquiries:  '#3b82f6',
  feedback:   '#8b5cf6',
  invalid:    '#64748b',
};

const tabMeta: Record<string, { icon: string; color: string; label: string }> = {
  orders:     { icon: '📦', color: C.orders,     label: 'Orders' },
  complaints: { icon: '⚠️', color: C.complaints, label: 'Complaints' },
  inquiries:  { icon: '💬', color: C.inquiries,  label: 'Inquiries' },
  feedback:   { icon: '⭐', color: C.feedback,   label: 'Feedback' },
  invalid:    { icon: '🚫', color: C.invalid,    label: 'Invalid' },
};

type CategoryItem = {
  id?: string;
  name: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
};

type CategoriesData = {
  orders: CategoryItem[];
  complaints: CategoryItem[];
  inquiries: CategoryItem[];
  feedback: CategoryItem[];
  invalid: CategoryItem[];
};

export default function Categories() {
  const { darkMode } = useContext(ThemeContext);

  const bg = darkMode ? '#0f0f14' : '#f8fafc';
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const txt = darkMode ? '#f1f5f9' : '#0f172a';
  const sub = darkMode ? '#64748b' : '#94a3b8';
  const inputBg = darkMode ? '#16162a' : '#f1f5f9';
  const border = darkMode ? '#2d2d40' : '#e2e8f0';

  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newItem, setNewItem] = useState('');

  const [data, setData] = useState<CategoriesData>({
    orders: [], complaints: [], inquiries: [], feedback: [], invalid: [],
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1500);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const result = await getCategories();
      setData({
        orders: result.orders || [], complaints: result.complaints || [],
        inquiries: result.inquiries || [], feedback: result.feedback || [],
        invalid: result.invalid || [],
      });
    } catch (e) {
      console.log('Error loading categories:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const saveItem = async () => {
    if (!newItem) return;
    try {
      if (editIndex !== null) {
        const item = data[activeTab as keyof CategoriesData][editIndex];
        if (item?.id) await updateCategoryItem(activeTab, item.id, { name: newItem });
      } else {
        await addCategoryItem(activeTab, newItem);
      }
      await loadData();
    } catch (e) {
      console.log('Error saving item:', e);
    }
    setNewItem(''); setEditIndex(null); setModalVisible(false);
  };

  const deleteItem = async (index: number) => {
    const item = data[activeTab as keyof CategoriesData][index];
    if (!item?.id) return;
    try { await deleteCategoryItem(activeTab, item.id); await loadData(); }
    catch (e) { console.log('Error deleting item:', e); }
  };

  const editItem = (index: number) => {
    const item = data[activeTab as keyof CategoriesData][index];
    setNewItem(item?.name ?? ''); setEditIndex(index); setModalVisible(true);
  };

  const cycleItemStatus = async (index: number) => {
    if (activeTab === 'feedback' || activeTab === 'invalid') return;
    const list = data[activeTab as keyof CategoriesData] || [];
    const current = list[index];
    if (!current?.id) return;
    const normalizedStatus = (current.status || '').toLowerCase();
    let nextStatus = current.status;
    if (activeTab === 'orders') {
      nextStatus = normalizedStatus === 'pending' ? 'In Progress' : normalizedStatus === 'in progress' ? 'Completed' : 'Pending';
    } else if (activeTab === 'complaints') {
      nextStatus = normalizedStatus === 'open' ? 'Resolved' : 'Open';
    } else if (activeTab === 'inquiries') {
      nextStatus = normalizedStatus === 'not answered' ? 'Answered' : 'Not Answered';
    }
    try { await updateCategoryItem(activeTab, current.id, { status: nextStatus as CategoryItem['status'] }); await loadData(); }
    catch (e) { console.log('Error updating status:', e); }
  };

  const filteredData = data[activeTab as keyof CategoriesData].filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeColor = tabMeta[activeTab]?.color || C.accent;

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'resolved' || s === 'answered') return '#10b981';
    if (s === 'in progress') return '#f59e0b';
    return '#64748b';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.accent} colors={[C.accent]} />}
    >

      {/* ━━━ HEADER ━━━ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, marginRight: 10 }}>
          <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 34, height: 34, borderRadius: 8 }} resizeMode="contain" />
        </View>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: txt, letterSpacing: -0.5 }}>Categories</Text>
          <Text style={{ color: sub, fontSize: 13, fontWeight: '500', marginTop: 2 }}>Manage your message categories</Text>
        </View>
      </View>

      {/* ━━━ TABS ━━━ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginBottom: 16, gap: 8 }}>
        {Object.entries(tabMeta).map(([key, meta]) => {
          const isActive = activeTab === key;
          const count = data[key as keyof CategoriesData]?.length || 0;
          return (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
                backgroundColor: isActive ? meta.color : (darkMode ? '#1e1e2e' : '#ffffff'),
                borderWidth: isActive ? 0 : 1, borderColor: border,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                elevation: isActive ? 4 : 1,
                shadowColor: isActive ? meta.color : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.3 : 0.05,
                shadowRadius: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>{meta.icon}</Text>
              <Text style={{ color: isActive ? '#fff' : txt, fontWeight: '700', fontSize: 13 }}>{meta.label}</Text>
              <View style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (darkMode ? '#334155' : '#f1f5f9'),
                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
              }}>
                <Text style={{ color: isActive ? '#fff' : sub, fontSize: 11, fontWeight: '800' }}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ━━━ SEARCH + ADD ━━━ */}
      <View style={{ flexDirection: 'row', marginBottom: 16, gap: 10 }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center',
          backgroundColor: inputBg, borderRadius: 14, paddingHorizontal: 12,
          borderWidth: 1, borderColor: border,
        }}>
          <Ionicons name="search" size={18} color={sub} />
          <TextInput
            placeholder="Search items..."
            placeholderTextColor={sub}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: txt, fontSize: 14, fontWeight: '500' }}
            value={search} onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: activeColor, paddingHorizontal: 18, borderRadius: 14,
            justifyContent: 'center', alignItems: 'center',
            elevation: 4, shadowColor: activeColor,
            shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
          }}
          onPress={() => { setEditIndex(null); setNewItem(''); setModalVisible(true); }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ━━━ ITEMS LIST ━━━ */}
      {filteredData.length === 0 ? (
        <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 30, alignItems: 'center', elevation: 2 }}>
          <Ionicons name="folder-open-outline" size={40} color={sub} />
          <Text style={{ color: txt, fontWeight: '700', fontSize: 15, marginTop: 10 }}>No items found</Text>
          <Text style={{ color: sub, fontSize: 13, marginTop: 4 }}>Add your first {activeTab} item above</Text>
        </View>
      ) : (
        filteredData.map((item, index) => {
          const statusText = item.status ?? 'Pending';
          const statusColor = getStatusColor(statusText);
          return (
            <View key={item.id || index} style={{
              backgroundColor: cardBg, borderRadius: 18, padding: 16, marginBottom: 10,
              flexDirection: 'row', alignItems: 'center',
              elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06, shadowRadius: 6,
              borderLeftWidth: 3, borderLeftColor: activeColor,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: txt, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>{item.name}</Text>
                {['orders', 'complaints', 'inquiries'].includes(activeTab) && (
                  <TouchableOpacity onPress={() => cycleItemStatus(index)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
                    <Text style={{ color: statusColor, fontSize: 12, fontWeight: '700' }}>
                      {statusText} <Text style={{ color: sub, fontWeight: '500' }}>· tap to change</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {activeTab === 'orders' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => editItem(index)}
                    style={{ backgroundColor: C.accent + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                    <Text style={{ color: C.accent, fontWeight: '700', fontSize: 12 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteItem(index)}
                    style={{ backgroundColor: '#ef444415', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 12 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* ━━━ MODAL ━━━ */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: activeColor + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 20 }}>{tabMeta[activeTab]?.icon}</Text>
              </View>
              <View>
                <Text style={{ color: txt, fontSize: 18, fontWeight: '800' }}>
                  {editIndex !== null ? 'Edit Item' : 'New Item'}
                </Text>
                <Text style={{ color: sub, fontSize: 13, marginTop: 2 }}>
                  {tabMeta[activeTab]?.label} category
                </Text>
              </View>
            </View>

            <TextInput
              placeholder="Enter name..."
              placeholderTextColor={sub}
              style={{
                backgroundColor: inputBg, color: txt, fontSize: 16, fontWeight: '500',
                padding: 14, borderRadius: 14, borderWidth: 1, borderColor: border,
                marginBottom: 20,
              }}
              value={newItem} onChangeText={setNewItem}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: darkMode ? '#1e1e30' : '#f1f5f9', alignItems: 'center' }}
              >
                <Text style={{ color: txt, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveItem}
                style={{
                  flex: 1, padding: 14, borderRadius: 14, backgroundColor: activeColor, alignItems: 'center',
                  elevation: 4, shadowColor: activeColor, shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3, shadowRadius: 6,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: '90%', padding: 24, borderRadius: 24,
    elevation: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
});