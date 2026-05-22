import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  apiLogout, getProfile, updateProfile,
  getNotificationPreferences, updateNotificationPreferences
} from '../services/api';

const NOTIFICATION_TYPES = [
  { key: 'new_message', label: 'New Messages', icon: 'chatbubble', color: '#3B82F6', desc: 'Alerts when customers send a WhatsApp message' },
  { key: 'order_update', label: 'Orders', icon: 'cart', color: '#22C55E', desc: 'Alerts for new orders' },
  { key: 'complaint_alert', label: 'Complaints', icon: 'alert-circle', color: '#EF4444', desc: 'High priority alerts for complaints' },
  { key: 'reminder', label: 'Reminders', icon: 'alarm', color: '#F59E0B', desc: 'Alerts for pending messages older than 4 days' },
  { key: 'status_change', label: 'Status Updates', icon: 'checkmark-circle', color: '#06B6D4', desc: 'Alerts when a message status changes' },
  { key: 'login', label: 'Login Alerts', icon: 'log-in', color: '#8B5CF6', desc: 'Security alerts for new logins' },
  { key: 'email_on_login', label: 'Email on Login', icon: 'mail', color: '#EC4899', desc: 'Send an email whenever someone logs in' },
];

export default function ProfileScreen() {
  const { darkMode, toggleTheme, t } = useContext(ThemeContext);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfile] = useState({ name: '', businessName: '', phone: '' });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      let email = await AsyncStorage.getItem('email');
      const userStr = await AsyncStorage.getItem('walleto_user');
      if (!email && userStr) { try { email = JSON.parse(userStr).email; } catch {} }
      if (!email) { router.replace('/(auth)/auth'); return; }
      setUserEmail(email);
      const [profData, prefsData] = await Promise.all([getProfile(email), getNotificationPreferences(email)]);
      setProfile({ name: profData.name || '', businessName: profData.businessName || '', phone: profData.phone || '' });
      setPrefs(prefsData);
    } catch (err: any) { console.log('Profile load error:', err.message); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') { await apiLogout(); router.replace('/(auth)/auth'); return; }
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await apiLogout(); router.replace('/(auth)/auth'); } },
    ]);
  };

  const saveProfile = async () => {
    setSaving(true);
    try { await updateProfile(userEmail, profile); Alert.alert('Success', 'Profile saved successfully'); }
    catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const togglePref = async (key: string) => {
    const newVal = !prefs[key];
    const newPrefs = { ...prefs, [key]: newVal };
    setPrefs(newPrefs);
    try { await updateNotificationPreferences(userEmail, newPrefs); }
    catch { setPrefs(prefs); Alert.alert('Error', 'Failed to save preference'); }
  };

  if (loading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={t.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

          <Animated.View entering={FadeInDown.delay(50).springify()} style={st.header}>
            <Text style={[st.title, { color: t.text }]}>Profile & Settings</Text>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={[st.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={st.avatarRow}>
              <View style={[st.avatar, { backgroundColor: t.primary }]}>
                <Text style={st.avatarText}>{profile.name ? profile.name.charAt(0).toUpperCase() : 'W'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.userName, { color: t.text }]}>{profile.name || 'Walleto User'}</Text>
                <Text style={[st.userEmail, { color: t.subText }]}>{userEmail}</Text>
              </View>
            </View>
            <View style={[st.divider, { backgroundColor: t.border }]} />

            <Text style={[st.inputLabel, { color: t.text }]}>Full Name</Text>
            <TextInput style={[st.input, { backgroundColor: t.bg, borderColor: t.border, color: t.text }]}
              value={profile.name} onChangeText={val => setProfile({ ...profile, name: val })} placeholder="Your Name" placeholderTextColor={t.muted} />

            <Text style={[st.inputLabel, { color: t.text }]}>Business Name</Text>
            <TextInput style={[st.input, { backgroundColor: t.bg, borderColor: t.border, color: t.text }]}
              value={profile.businessName} onChangeText={val => setProfile({ ...profile, businessName: val })} placeholder="e.g. Radhe Sweets" placeholderTextColor={t.muted} />

            <TouchableOpacity onPress={saveProfile} disabled={saving}
              style={[st.saveBtn, { backgroundColor: t.primary, opacity: saving ? 0.7 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.saveBtnText}>Save Profile</Text>}
            </TouchableOpacity>
          </Animated.View>

          {/* App Settings */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={[st.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[st.sectionTitle, { color: t.text }]}>App Settings</Text>
            <View style={st.settingRow}>
              <View style={[st.settingIcon, { backgroundColor: darkMode ? '#FBBF2415' : '#6366F115' }]}>
                <Ionicons name={darkMode ? 'sunny' : 'moon'} size={20} color={darkMode ? '#FBBF24' : '#6366F1'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.settingName, { color: t.text }]}>Dark Mode</Text>
                <Text style={[st.settingDesc, { color: t.subText }]}>Toggle app appearance</Text>
              </View>
              <Switch value={darkMode} onValueChange={toggleTheme}
                trackColor={{ false: '#D1D5DB', true: t.primary }}
                thumbColor={darkMode ? '#fff' : '#fff'} />
            </View>
          </Animated.View>

          {/* Notifications */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[st.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[st.sectionTitle, { color: t.text }]}>Notification Preferences</Text>
            <Text style={[st.sectionDesc, { color: t.subText }]}>Choose which alerts you want to receive.</Text>
            <View style={[st.divider, { backgroundColor: t.border }]} />

            {NOTIFICATION_TYPES.map((type, i) => (
              <View key={type.key} style={[
                st.settingRow,
                i !== NOTIFICATION_TYPES.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: t.border, paddingBottom: 16, marginBottom: 16 }
              ]}>
                <View style={[st.settingIcon, { backgroundColor: `${type.color}15` }]}>
                  <Ionicons name={type.icon as any} size={20} color={type.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.settingName, { color: t.text }]}>{type.label}</Text>
                  <Text style={[st.settingDesc, { color: t.subText }]}>{type.desc}</Text>
                </View>
                <Switch value={prefs[type.key] ?? true} onValueChange={() => togglePref(type.key)}
                  trackColor={{ false: '#D1D5DB', true: t.primary }}
                  thumbColor="#fff" />
              </View>
            ))}
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <TouchableOpacity onPress={handleLogout} style={[st.logoutBtn, { borderColor: t.error }]}>
              <Ionicons name="log-out-outline" size={20} color={t.error} />
              <Text style={[st.logoutBtnText, { color: t.error }]}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 4 },
  divider: { height: 1, marginVertical: 16, opacity: 0.5 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 16 },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  sectionDesc: { fontSize: 13, marginBottom: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  settingDesc: { fontSize: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  logoutBtnText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
});