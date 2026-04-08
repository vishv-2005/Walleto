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
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CategoryItem = {
  name: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
};

type CategoriesData = {
  orders: CategoryItem[];
  complaints: CategoryItem[];
  inquiries: CategoryItem[];
  logistics: CategoryItem[];
  others: CategoryItem[];
};

export default function Categories() {

  const { darkMode } = useContext(ThemeContext);

  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [data, setData] = useState<CategoriesData>({
    orders: [],
    complaints: [],
    inquiries: [],
    logistics: [],
    others: [],
  });

  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem('categoriesData');
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const safe: CategoriesData = {
        orders: Array.isArray(parsed?.orders)
          ? parsed.orders.map((x: any) =>
              typeof x === 'string' ? { name: x, status: 'Pending' } : { name: String(x?.name ?? ''), status: x?.status }
            ).filter((x: CategoryItem) => x.name)
          : [],
        complaints: Array.isArray(parsed?.complaints)
          ? parsed.complaints.map((x: any) =>
              typeof x === 'string' ? { name: x } : { name: String(x?.name ?? '') }
            ).filter((x: CategoryItem) => x.name)
          : [],
        inquiries: Array.isArray(parsed?.inquiries)
          ? parsed.inquiries.map((x: any) =>
              typeof x === 'string' ? { name: x } : { name: String(x?.name ?? '') }
            ).filter((x: CategoryItem) => x.name)
          : [],
        logistics: Array.isArray(parsed?.logistics)
          ? parsed.logistics.map((x: any) =>
              typeof x === 'string' ? { name: x } : { name: String(x?.name ?? '') }
            ).filter((x: CategoryItem) => x.name)
          : [],
        others: Array.isArray(parsed?.others)
          ? parsed.others.map((x: any) =>
              typeof x === 'string' ? { name: x } : { name: String(x?.name ?? '') }
            ).filter((x: CategoryItem) => x.name)
          : [],
      };

      setData(safe);
    } catch (e) {
      console.log('Error loading categories:', e);
    }
  };

  const persist = async (next: CategoriesData) => {
    setData(next);
    await AsyncStorage.setItem('categoriesData', JSON.stringify(next));
  };

  // ADD / EDIT
  const saveItem = async () => {
    if (!newItem) return;

    let updated = [...data[activeTab as keyof CategoriesData]];

    if (editIndex !== null) {
      updated[editIndex] = {
        ...updated[editIndex],
        name: newItem,
      };
    } else {
      updated.push(
        activeTab === 'orders' || activeTab === 'logistics'
          ? { name: newItem, status: 'Pending' }
          : { name: newItem }
      );
    }

    await persist({
      ...data,
      [activeTab]: updated,
    } as CategoriesData);

    setNewItem('');
    setEditIndex(null);
    setModalVisible(false);
  };

  // DELETE
  const deleteItem = async (index: number) => {
    let updated = [...data[activeTab as keyof CategoriesData]];
    updated.splice(index, 1);

    await persist({
      ...data,
      [activeTab]: updated,
    } as CategoriesData);
  };

  // EDIT
  const editItem = (index: number) => {
    const item = data[activeTab as keyof CategoriesData][index];
    setNewItem(item?.name ?? '');
    setEditIndex(index);
    setModalVisible(true);
  };

  // FILTER
  const filteredData = data[activeTab as keyof CategoriesData].filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const cycleOrderStatus = async (index: number) => {
    if (activeTab !== 'orders' && activeTab !== 'logistics') return;
    const list = activeTab === 'orders' ? data.orders : data.logistics;
    const current = list[index];
    const nextStatus: CategoryItem['status'] =
      current.status === 'Pending'
        ? 'In Progress'
        : current.status === 'In Progress'
          ? 'Completed'
          : 'Pending';

    const updated = [...list];
    updated[index] = { ...updated[index], status: nextStatus };
    await persist(
      activeTab === 'orders'
        ? { ...data, orders: updated }
        : { ...data, logistics: updated }
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>

      <Text style={[styles.title, { color: text }]}>
        Categories
      </Text>

      {/* TABS (HORIZONTAL SCROLL) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {['orders', 'complaints', 'inquiries', 'logistics', 'others'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={styles.tabLabel}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* SEARCH + ADD */}
      <View style={styles.controls}>
        <TextInput
          placeholder="Search..."
          placeholderTextColor="gray"
          style={[styles.input, { backgroundColor: card, color: text }]}
          value={search}
          onChangeText={setSearch}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditIndex(null);
            setNewItem('');
            setModalVisible(true);
          }}
        >
          <Text style={{ color: '#fff' }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE HEADER */}
      <View style={[styles.row, { backgroundColor: card }]}>
        <Text style={[styles.cell, { color: text }]}>Name</Text>
        <Text style={[styles.cell, { color: text }]}>Actions</Text>
      </View>

      {/* TABLE DATA */}
      {filteredData.map((item, index) => (
        <View key={index} style={[styles.row, { backgroundColor: card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cell, { color: text }]}>{item.name}</Text>
            {activeTab === 'orders' || activeTab === 'logistics' ? (
              <TouchableOpacity onPress={() => cycleOrderStatus(index)} style={{ marginTop: 4 }}>
                <Text style={{ color: darkMode ? '#22c55e' : '#16a34a', fontSize: 12 }}>
                  Status: {item.status ?? 'Pending'} (tap to change)
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={() => editItem(index)}>
              <Text style={styles.edit}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteItem(index)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBg}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <Text style={{ color: text, marginBottom: 10 }}>
              {editIndex !== null ? "Edit Item" : "Add Item"}
            </Text>

            <TextInput
              placeholder="Enter name"
              placeholderTextColor={darkMode ? '#6b7280' : '#9ca3af'}
              keyboardAppearance={darkMode ? 'dark' : 'light'}
              selectionColor={text}
              autoCorrect={false}
              autoComplete="off"
              textAlignVertical="center"
              style={[
                styles.input,
                {
                  backgroundColor: darkMode ? '#111115' : '#f0f0f0',
                  color: text,
                  fontSize: 16,
                  fontWeight: '500',
                  lineHeight: 20,
                  minHeight: 46,
                  borderWidth: 1,
                  borderColor: darkMode ? '#2b2b2f' : '#e5e7eb',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                },
              ]}
              value={newItem}
              onChangeText={setNewItem}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={saveItem}>
                <Text style={{ color: 'green' }}>Save</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, padding: 20 },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15
  },

  tabs: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 15
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8
  },

  activeTab: {
    backgroundColor: '#4CAF50'
  },
  tabLabel: {
    textTransform: 'capitalize',
    fontSize: 14,
    fontWeight: '600'
  },

  controls: {
    flexDirection: 'row',
    marginBottom: 15
  },

  input: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    marginRight: 10
  },

  addBtn: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center'
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8
  },

  cell: {
    flex: 1
  },

  actions: {
    flexDirection: 'row',
    gap: 10
  },

  edit: {
    color: 'blue'
  },

  delete: {
    color: 'red'
  },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  modalBox: {
    width: '92%',
    padding: 26,
    borderRadius: 15,
    minHeight: 220
  },

  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingBottom: 6,
    width: '100%',
    alignItems: 'center'
  }

});