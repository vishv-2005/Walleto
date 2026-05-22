import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiSignup } from '../services/api';
import Animated, {
  FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, Easing, interpolate,
  withDelay,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

// ── Floating Orb ─────────────────────────────────────────
function FloatingOrb({ color, size, startX, startY, duration, delay: d }: any) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
      ), -1
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 0.5, 1], [0, 30, -10]) },
      { translateY: interpolate(progress.value, [0, 0.5, 1], [0, -40, 20]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.15, 0.95]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.6, 0.9, 0.6]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute', left: startX, top: startY,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
    }, style]} />
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { checkToken(); }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) router.replace('/(tabs)');
    } catch { }
    finally { setInitializing(false); }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please fill email and password');
      return;
    }
    if (!isLogin && (!name.trim() || !businessName.trim() || !phone.trim())) {
      Alert.alert('Required', 'Please fill all fields for registration');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) await apiLogin(email, password);
      else await apiSignup(email, password, name, businessName);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally { setLoading(false); }
  };

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Live Animated Background */}
      <View style={StyleSheet.absoluteFill}>
        <FloatingOrb color="rgba(37,211,102,0.15)" size={280} startX={-80} startY={H * 0.1} duration={8000} delay={0} />
        <FloatingOrb color="rgba(99,102,241,0.12)" size={220} startX={W * 0.5} startY={H * 0.55} duration={10000} delay={2000} />
        <FloatingOrb color="rgba(59,130,246,0.10)" size={180} startX={W * 0.2} startY={H * 0.75} duration={9000} delay={4000} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.header}>
          <View style={s.logoBox}>
            <View style={s.logoInner}>
              <Ionicons name="wallet" size={32} color="#25D366" />
            </View>
          </View>
          <Text style={s.title}>Walleto</Text>
          <Text style={s.subtitle}>Smart WhatsApp Business Manager</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.formCard}>
          <Text style={s.formTitle}>{isLogin ? 'Welcome back' : 'Create account'}</Text>
          <Text style={s.formDesc}>
            {isLogin ? 'Sign in to manage your business' : 'Set up your business account'}
          </Text>

          {!isLogin && (
            <>
              <View style={s.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#64748B" style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Full Name" placeholderTextColor="#64748B"
                  value={name} onChangeText={setName} />
              </View>
              <View style={s.inputWrap}>
                <Ionicons name="business-outline" size={18} color="#64748B" style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Business Name" placeholderTextColor="#64748B"
                  value={businessName} onChangeText={setBusinessName} />
              </View>
              <View style={s.inputWrap}>
                <Ionicons name="call-outline" size={18} color="#64748B" style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Phone Number" placeholderTextColor="#64748B"
                  keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              </View>
            </>
          )}

          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#64748B" style={s.inputIcon} />
            <TextInput style={s.input} placeholder="Email Address" placeholderTextColor="#64748B"
              keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          </View>

          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={s.inputIcon} />
            <TextInput style={s.input} placeholder="Password" placeholderTextColor="#64748B"
              secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
              <Text style={{ color: '#25D366', fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.submitBtn, { opacity: loading ? 0.7 : 1, marginTop: isLogin ? 0 : 8 }]}
            onPress={handleSubmit} disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={s.footer}>
          <Text style={{ color: '#94A3B8', fontSize: 14 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); }}>
            <Text style={{ color: '#25D366', fontWeight: '700', fontSize: 14 }}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(37,211,102,0.10)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(37,211,102,0.15)',
  },
  logoInner: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: 'rgba(37,211,102,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 36, fontWeight: '800', color: '#F1F5F9', letterSpacing: -1.5 },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: 6, fontWeight: '500' },

  formCard: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    padding: 28, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(30,41,59,0.8)',
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
  formDesc: { fontSize: 14, color: '#64748B', marginBottom: 28 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(2,6,23,0.6)',
    borderWidth: 1, borderColor: '#1E293B',
    borderRadius: 14, marginBottom: 14, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, color: '#F1F5F9', fontSize: 15 },
  eyeIcon: { padding: 10 },

  submitBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
});
