import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Alert, RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, Layout, StretchInY, StretchOutY } from 'react-native-reanimated';
import { getCategories, addCategoryItem, updateCategoryItem, deleteCategoryItem } from '../services/api';

const CATEGORIES = ['order', 'complaint', 'inquiry', 'feedback', 'invalid'];

const STATUS_OPTIONS: Record<string, string[]> = {
  order: ['Pending', 'In Progress', 'Completed'],
  complaint: ['Open', 'Resolved'],
  inquiry: ['Not Answered', 'Answered'],
  feedback: [],
  invalid: [],
};

const CAT_ICONS: Record<string, string> = {
  order: 'cart', complaint: 'alert-circle', inquiry: 'help-circle',
  feedback: 'star', invalid: 'close-circle',
};

export default function CategoriesScreen() {
  const { darkMode, t } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('order');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemName, setItemName] = useState('');
  const [itemStatus, setItemStatus] = useState('');

  const catColor = (t as any)[activeTab] || t.primary;

  const fetchData = useCallback(async () => {
    try { setData(await getCategories()); }
    catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!itemName.trim()) { Alert.alert('Required', 'Item name is required'); return; }
    const cat = activeTab;
    const isNew = !editingItem;
    const tempId = editingItem ? editingItem.id : Date.now().toString();
    const newItem = { id: tempId, name: itemName, status: itemStatus || STATUS_OPTIONS[cat]?.[0] || '' };
    setData((prev: any) => ({
      ...prev,
      [cat]: isNew ? [...(prev[cat] || []), newItem] : prev[cat].map((i: any) => i.id === tempId ? newItem : i)
    }));
    setModalVisible(false);
    try {
      if (isNew) await addCategoryItem(cat, itemName, itemStatus);
      else await updateCategoryItem(cat, editingItem.id, { name: itemName, status: itemStatus });
      fetchData();
    } catch (err: any) { Alert.alert('Error', err.message); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm Delete', 'Remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setData((prev: any) => ({ ...prev, [activeTab]: prev[activeTab].filter((i: any) => i.id !== id) }));
          try { await deleteCategoryItem(activeTab, id); fetchData(); }
          catch (err: any) { Alert.alert('Error', err.message); fetchData(); }
        },
      },
    ]);
  };

  const openAddModal = () => { setEditingItem(null); setItemName(''); setItemStatus(STATUS_OPTIONS[activeTab]?.[0] || ''); setModalVisible(true); };
  const openEditModal = (item: any) => { setEditingItem(item); setItemName(item.name || item.message); setItemStatus(item.status || ''); setModalVisible(true); };

  const activeItems = data[activeTab] || [];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={[st.title, { color: t.text }]}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {CATEGORIES.map(cat => {
            const isActive = activeTab === cat;
            const cc = (t as any)[cat] || t.muted;
            return (
              <TouchableOpacity key={cat} activeOpacity={0.7} onPress={() => setActiveTab(cat)}
                style={[st.tabPill, {
                  backgroundColor: isActive ? cc : t.cardAlt,
                  borderColor: isActive ? cc : t.border,
                }]}>
                <Ionicons name={CAT_ICONS[cat] as any} size={14} color={isActive ? '#fff' : t.subText} style={{ marginRight: 6 }} />
                <Text style={{
                  color: isActive ? '#fff' : t.subText,
                  fontWeight: isActive ? '700' : '600', fontSize: 13, textTransform: 'capitalize'
                }}>
                  {cat} {data[cat]?.length > 0 ? `(${data[cat].length})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={catColor} />}
      >
        <View style={st.sectionHeader}>
          <Text style={[st.sectionTitle, { color: t.text }]}>{activeItems.length} {activeTab}s</Text>
        </View>

        {activeItems.length === 0 ? (
          <Animated.View entering={FadeInDown} style={[st.emptyState, { backgroundColor: t.card, borderColor: t.border }]}>
            <Ionicons name={CAT_ICONS[activeTab] as any} size={48} color={catColor} opacity={0.3} />
            <Text style={[st.emptyTitle, { color: t.text }]}>No {activeTab}s yet</Text>
            <Text style={[st.emptyDesc, { color: t.subText }]}>Wait for incoming messages.</Text>
          </Animated.View>
        ) : (
          activeItems.map((item: any, index: number) => {
            const isDone = (item.status || '').match(/Completed|Resolved|Answered/i);
            return (
              <Animated.View key={item.id} entering={FadeInRight.delay(index * 40).springify()} layout={Layout.springify()}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => openEditModal(item)}
                  style={[st.itemCard, { backgroundColor: t.card, borderColor: t.border, borderLeftColor: catColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.itemName, { color: t.text }]} numberOfLines={2}>
                      {item.name || item.message}
                    </Text>
                    {item.status && (
                      <View style={[st.statusBadge, {
                        backgroundColor: isDone ? `${t.success}12` : t.cardAlt,
                      }]}>
                        <Text style={[st.statusText, { color: isDone ? t.success : t.subText }]}>{item.status}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <View style={[st.deleteBtn, { backgroundColor: t.errorLight }]}>
                      <Ionicons name="trash-outline" size={18} color={t.error} />
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <Animated.View entering={StretchInY.springify()} exiting={StretchOutY}
            style={[st.modalCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={st.modalHeader}>
              <View style={[st.modalIconWrap, { backgroundColor: `${catColor}15` }]}>
                <Ionicons name={CAT_ICONS[activeTab] as any} size={20} color={catColor} />
              </View>
              <Text style={[st.modalTitle, { color: t.text }]}>
                {editingItem ? `Edit ${activeTab}` : `New ${activeTab}`}
              </Text>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={[st.inputLabel, { color: t.text }]}>Details</Text>
              <TextInput
                style={[st.input, { backgroundColor: t.bg, borderColor: t.border, color: t.text }]}
                placeholder={`Enter ${activeTab} details...`}
                placeholderTextColor={t.muted}
                value={itemName} onChangeText={setItemName} multiline
              />
              {STATUS_OPTIONS[activeTab]?.length > 0 && (
                <>
                  <Text style={[st.inputLabel, { color: t.text, marginTop: 16 }]}>Status</Text>
                  <View style={st.statusOptionsRow}>
                    {STATUS_OPTIONS[activeTab].map(status => (
                      <TouchableOpacity key={status} onPress={() => setItemStatus(status)}
                        style={[st.statusOption, {
                          backgroundColor: itemStatus === status ? catColor : t.bg,
                          borderColor: itemStatus === status ? catColor : t.border
                        }]}>
                        <Text style={{
                          color: itemStatus === status ? '#fff' : t.subText,
                          fontWeight: itemStatus === status ? '700' : '500', fontSize: 13
                        }}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <View style={st.modalActions}>
                <TouchableOpacity style={st.modalBtnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={[st.modalBtnCancelText, { color: t.subText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.modalBtnSave, { backgroundColor: catColor }]} onPress={handleSave}>
                  <Text style={st.modalBtnSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 999, marginRight: 8, borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  emptyState: { padding: 40, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 14, marginBottom: 10, borderWidth: 1, borderLeftWidth: 4,
  },
  itemName: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0 },
  modalIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  statusOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  modalBtnCancel: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalBtnCancelText: { fontSize: 15, fontWeight: '600' },
  modalBtnSave: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  modalBtnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});