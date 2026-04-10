import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../context/ThemeContext';
import { getProfile, updateProfile } from '../services/api';

// ━━━ COLOR SYSTEM ━━━
const C = {
  accent:  '#6366f1',
  emerald: '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
};

export default function Profile() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useContext(ThemeContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const bg = darkMode ? '#0f0f14' : '#f8fafc';
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const txt = darkMode ? '#f1f5f9' : '#0f172a';
  const sub = darkMode ? '#64748b' : '#94a3b8';
  const inputBg = darkMode ? '#16162a' : '#f1f5f9';
  const border = darkMode ? '#2d2d40' : '#e2e8f0';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('userEmail');
      const notify = await AsyncStorage.getItem('notificationsEnabled');
      if (notify === 'true') setNotificationsEnabled(true);
      if (savedEmail) {
        setEmail(savedEmail);
        try {
          const profile = await getProfile(savedEmail);
          if (profile.name) setName(profile.name);
        } catch (e) { console.log('Could not load profile from server:', e); }
      }
    } catch (err) { console.log("Error loading profile:", err); }
  };

  const saveProfile = async () => {
    try {
      const currentEmail = await AsyncStorage.getItem('userEmail');
      if (currentEmail) {
        await updateProfile(currentEmail, { name, newEmail: email !== currentEmail ? email : undefined });
      }
      await AsyncStorage.setItem('name', name);
      await AsyncStorage.setItem('userEmail', email);
      Alert.alert("Success", "Profile Updated ✅");
    } catch (err) { console.log("Error saving profile:", err); }
  };

  const toggleNotification = async () => {
    try {
      const value = !notificationsEnabled;
      setNotificationsEnabled(value);
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
    } catch (err) { console.log("Error updating notifications:", err); }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('loggedIn');
      router.replace('/auth');
    } catch (err) { console.log("Logout error:", err); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* ━━━ HEADER ━━━ */}
      <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 10 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 28,
          backgroundColor: C.accent,
          justifyContent: 'center', alignItems: 'center',
          elevation: 8, shadowColor: C.accent,
          shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
          marginBottom: 14,
        }}>
          <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900' }}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: txt }}>{name || 'Your Name'}</Text>
        <Text style={{ color: sub, fontSize: 14, marginTop: 4 }}>{email || 'your@email.com'}</Text>
      </View>

      {/* ━━━ ACCOUNT DETAILS ━━━ */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 }}>
          Account
        </Text>
        <View style={{
          backgroundColor: cardBg, borderRadius: 22, padding: 20,
          elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06, shadowRadius: 8,
        }}>
          {/* Name */}
          <Text style={{ color: sub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Full Name</Text>
          <TextInput
            style={{
              backgroundColor: inputBg, color: txt, fontSize: 16, fontWeight: '500',
              padding: 14, borderRadius: 14, borderWidth: 1, borderColor: border, marginBottom: 16,
            }}
            value={name} onChangeText={setName}
            placeholderTextColor={sub}
          />

          {/* Email */}
          <Text style={{ color: sub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Email Address</Text>
          <TextInput
            style={{
              backgroundColor: inputBg, color: txt, fontSize: 16, fontWeight: '500',
              padding: 14, borderRadius: 14, borderWidth: 1, borderColor: border,
            }}
            value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none"
            placeholderTextColor={sub}
          />

          {/* Save Button */}
          <TouchableOpacity
            onPress={saveProfile}
            style={{
              backgroundColor: C.accent, padding: 16, borderRadius: 16, marginTop: 20,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              elevation: 6, shadowColor: C.accent,
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ━━━ PREFERENCES ━━━ */}
      <View style={{ marginBottom: 12, marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 }}>
          Preferences
        </Text>

        {/* Theme Toggle */}
        <View style={{
          backgroundColor: cardBg, borderRadius: 18, padding: 18, marginBottom: 10,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 6,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: C.accent + '18', justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={C.accent} />
            </View>
            <View>
              <Text style={{ color: txt, fontWeight: '700', fontSize: 15 }}>Dark Mode</Text>
              <Text style={{ color: sub, fontSize: 12, marginTop: 2 }}>{darkMode ? 'Enabled' : 'Disabled'}</Text>
            </View>
          </View>
          <Switch
            value={darkMode} onValueChange={toggleTheme}
            trackColor={{ false: '#e2e8f0', true: C.accent + '60' }}
            thumbColor={darkMode ? C.accent : '#fff'}
          />
        </View>

        {/* Notifications Toggle */}
        <View style={{
          backgroundColor: cardBg, borderRadius: 18, padding: 18,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 6,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: C.amber + '18', justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="notifications" size={20} color={C.amber} />
            </View>
            <View>
              <Text style={{ color: txt, fontWeight: '700', fontSize: 15 }}>Notifications</Text>
              <Text style={{ color: sub, fontSize: 12, marginTop: 2 }}>{notificationsEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled} onValueChange={toggleNotification}
            trackColor={{ false: '#e2e8f0', true: C.amber + '60' }}
            thumbColor={notificationsEnabled ? C.amber : '#fff'}
          />
        </View>
      </View>

      {/* ━━━ WALLETO BRANDING ━━━ */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
        <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: C.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, marginBottom: 8 }}>
          <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 46, height: 46, borderRadius: 12 }} resizeMode="contain" />
        </View>
        <Text style={{ color: sub, fontSize: 12, fontWeight: '600' }}>Walleto v1.0</Text>
        <Text style={{ color: sub, fontSize: 11, marginTop: 2 }}>Messages. Analytics. Conversions.</Text>
      </View>

      {/* ━━━ LOGOUT ━━━ */}
      <TouchableOpacity
        onPress={logout}
        style={{
          backgroundColor: C.red, padding: 16, borderRadius: 16,
          alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          elevation: 4, shadowColor: C.red,
          shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}