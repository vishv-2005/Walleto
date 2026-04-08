import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';

export default function Profile() {

  const router = useRouter();
  const { darkMode, toggleTheme } = useContext(ThemeContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // 🔥 LOAD DATA
  const loadData = async () => {
    try {
      const savedName = await AsyncStorage.getItem('name');
      const savedEmail = await AsyncStorage.getItem('userEmail');
      const notify = await AsyncStorage.getItem('notificationsEnabled');
      if (savedName) setName(savedName);
      if (savedEmail) setEmail(savedEmail);
      if (notify === 'true') setNotificationsEnabled(true);

    } catch (err) {
      console.log("Error loading profile:", err);
    }
  };

  // 💾 SAVE PROFILE
  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('name', name);
      await AsyncStorage.setItem('userEmail', email);

      Alert.alert("Success", "Profile Updated ✅");

    } catch (err) {
      console.log("Error saving profile:", err);
    }
  };

  // 🔔 TOGGLE NOTIFICATIONS
  const toggleNotification = async () => {
    try {
      const value = !notificationsEnabled;
      setNotificationsEnabled(value);
      await AsyncStorage.setItem('notificationsEnabled', value.toString());

    } catch (err) {
      console.log("Error updating notifications:", err);
    }
  };

  // 🚪 LOGOUT
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('loggedIn');
      router.replace('/auth');
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  // 🎨 THEME COLORS
  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';
  const subText = darkMode ? '#aaa' : '#666';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>

      {/* BACK */}
      <Text style={styles.back} onPress={() => router.back()}>
        ← Back
      </Text>

      {/* HEADER */}
      <Text style={[styles.header, { color: text }]}>
        Profile
      </Text>

      {/* ACCOUNT */}
      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={[styles.cardTitle, { color: text }]}>
          Account Details
        </Text>

        <Text style={{ color: text }}>
          Name: {name || '-'}
        </Text>

        <Text style={{ color: text }}>
          Email: {email || '-'}
        </Text>
      </View>

      {/* UPDATE */}
      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={[styles.cardTitle, { color: text }]}>
          Update Profile
        </Text>

        <Text style={[styles.label, { color: subText }]}>
          Full Name
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: darkMode ? '#333' : '#f9f9f9', color: text }]}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: subText }]}>
          Email
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: darkMode ? '#333' : '#f9f9f9', color: text }]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.btnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      {/* THEME */}
      <View style={[styles.cardRow, { backgroundColor: card }]}>
        <View>
          <Text style={[styles.cardTitle, { color: text }]}>
            Theme
          </Text>
          <Text style={{ color: subText }}>
            Dark Mode
          </Text>
        </View>

        <Switch value={darkMode} onValueChange={toggleTheme} />
      </View>

      {/* NOTIFICATIONS */}
      <View style={[styles.cardRow, { backgroundColor: card }]}>
        <View>
          <Text style={[styles.cardTitle, { color: text }]}>
            Notifications
          </Text>
          <Text style={{ color: subText }}>
            Enable Notifications
          </Text>
        </View>

        <Switch value={notificationsEnabled} onValueChange={toggleNotification} />
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20
  },

  back: {
    marginBottom: 10,
    color: '#4CAF50'
  },

  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20
  },

  card: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 15
  },

  cardRow: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },

  label: {
    fontSize: 12,
    marginTop: 10
  },

  input: {
    padding: 12,
    borderRadius: 10,
    marginTop: 5
  },

  saveBtn: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center'
  },

  logoutBtn: {
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },

  btnText: {
    color: '#fff',
    fontWeight: 'bold'
  }

});