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
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { getCategories, addCategoryItem, updateCategoryItem, deleteCategoryItem } from '../services/api';

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

  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState<CategoriesData>({
    orders: [],
    complaints: [],
    inquiries: [],
    feedback: [],
    invalid: [],
  });

  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const result = await getCategories();
      setData({
        orders: result.orders || [],
        complaints: result.complaints || [],
        inquiries: result.inquiries || [],
        feedback: result.feedback || [],
        invalid: result.invalid || [],
      });
    } catch (e) {
      console.log('Error loading categories:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // ADD / EDIT
  const saveItem = async () => {
    if (!newItem) return;

    try {
      if (editIndex !== null) {
        const item = data[activeTab as keyof CategoriesData][editIndex];
        if (item?.id) {
          await updateCategoryItem(activeTab, item.id, { name: newItem });
        }
      } else {
        await addCategoryItem(activeTab, newItem);
      }
      await loadData();
    } catch (e) {
      console.log('Error saving item:', e);
    }

    setNewItem('');
    setEditIndex(null);
    setModalVisible(false);
  };

  // DELETE
  const deleteItem = async (index: number) => {
    const item = data[activeTab as keyof CategoriesData][index];
    if (!item?.id) return;
    try {
      await deleteCategoryItem(activeTab, item.id);
      await loadData();
    } catch (e) {
      console.log('Error deleting item:', e);
    }
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

  const cycleItemStatus = async (index: number) => {
    if (activeTab === 'feedback' || activeTab === 'invalid') return;
    
    const list = data[activeTab as keyof CategoriesData] || [];
    const current = list[index];
    if (!current?.id) return;
    
    const normalizedStatus = (current.status || '').toLowerCase();
    let nextStatus = current.status;
    
    if (activeTab === 'orders') {
      nextStatus = normalizedStatus === 'pending' ? 'In Progress' 
                   : normalizedStatus === 'in progress' ? 'Completed' 
                   : 'Pending';
    } else if (activeTab === 'complaints') {
      nextStatus = normalizedStatus === 'open' ? 'Resolved' : 'Open';
    } else if (activeTab === 'inquiries') {
      nextStatus = normalizedStatus === 'not answered' ? 'Answered' : 'Not Answered';
    }

    try {
      await updateCategoryItem(activeTab, current.id, { status: nextStatus as CategoryItem['status'] });
      await loadData();
    } catch (e) {
      console.log('Error updating status:', e);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#22c55e" />}
    >

      <Text style={[styles.title, { color: text }]}>
        Categories
      </Text>

      {/* TABS (HORIZONTAL SCROLL) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {['orders', 'complaints', 'inquiries', 'feedback', 'invalid'].map(tab => (
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
        <View key={item.id || index} style={[styles.row, { backgroundColor: card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cell, { color: text }]}>{item.name}</Text>
            {['orders', 'complaints', 'inquiries'].includes(activeTab) ? (
              <TouchableOpacity onPress={() => cycleItemStatus(index)} style={{ marginTop: 4 }}>
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