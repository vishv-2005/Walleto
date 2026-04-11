import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiSignup } from '../services/api';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';

// ━━━ COLOR SYSTEM ━━━
const C = {
  accent: '#6366f1',
  accentDark: '#4f46e5',
  emerald: '#10b981',
  emeraldDark: '#059669',
  red: '#ef4444',
  slate: '#64748b',
};

export default function Auth() {
  const router = useRouter();
  const { darkMode } = useContext(ThemeContext);

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const logoScale = useSharedValue(0.8);
  const cardTranslateY = useSharedValue(30);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animations
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    cardTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loggedIn = await AsyncStorage.getItem('loggedIn');
        if (loggedIn === 'true') {
          router.replace('/(tabs)');
        }
      } catch (err) {
        console.log('Error checking login:', err);
      }
    })();
  }, [router]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const handleAuth = async () => {
    try {
      setError('');
      setLoading(true);

      const cleanedEmail = email.trim().toLowerCase();
      const cleanedPassword = password.trim();
      const cleanedName = name.trim();

      if (!isLogin && !cleanedName) {
        setError('Please enter your name');
        return;
      }

      if (!email || !password) {
        setError('Please fill all fields');
        return;
      }

      if (!validateEmail(cleanedEmail)) {
        setError('Invalid email format');
        return;
      }

      if (cleanedPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      if (!/[A-Z]/.test(cleanedPassword)) {
        setError('Password must include at least one uppercase letter');
        return;
      }

      if (!/[a-z]/.test(cleanedPassword)) {
        setError('Password must include at least one lowercase letter');
        return;
      }

      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(cleanedPassword)) {
        setError('Password must include at least one special character');
        return;
      }

      if (isLogin) {
        try {
          const result = await apiLogin(cleanedEmail, cleanedPassword);
          await AsyncStorage.setItem('loggedIn', 'true');
          await AsyncStorage.setItem('userEmail', cleanedEmail);
          if (result.user?.name) await AsyncStorage.setItem('name', result.user.name);
          setEmail('');
          setPassword('');
          setName('');
          router.replace('/(tabs)');
        } catch (err: any) {
          setError(err.message || 'Invalid email or password');
        }
      } else {
        try {
          await apiSignup(cleanedEmail, cleanedPassword, cleanedName);
          Alert.alert('🎉 Welcome!', 'Account created successfully! Please login.');
          setIsLogin(true);
          setEmail('');
          setPassword('');
          setName('');
        } catch (err: any) {
          setError(err.message || 'Signup failed. Try again.');
        }
      }
    } catch (err) {
      console.log('Auth Error:', err);
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setError('');
    setName('');
    // Bounce animation on toggle
    logoScale.value = withSequence(
      withTiming(0.9, { duration: 150 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
  };

  // Theme colors
  const bg = darkMode ? '#0a0a12' : '#f0f2f8';
  const cardBg = darkMode ? '#1a1a2e' : '#ffffff';
  const txt = darkMode ? '#f1f5f9' : '#0f172a';
  const sub = darkMode ? '#64748b' : '#94a3b8';
  const inputBg = darkMode ? '#12122a' : '#f8fafc';
  const inputBorder = darkMode ? '#2d2d50' : '#e2e8f0';
  const canSubmit = email && password && (!isLogin ? name : true) && !loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ━━━ DECORATIVE GRADIENT CIRCLES ━━━ */}
        <View style={[styles.gradientCircle, styles.circle1, { backgroundColor: C.accent + '15' }]} />
        <View style={[styles.gradientCircle, styles.circle2, { backgroundColor: C.emerald + '12' }]} />

        {/* ━━━ LOGO SECTION ━━━ */}
        <Animated.View style={[styles.logoSection, logoAnimStyle]}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} />
            <Image
              source={require('../../assets/images/walleto-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandName, { color: txt }]}>Walleto</Text>
          <Text style={[styles.brandTag, { color: sub }]}>
            Smart WhatsApp CRM
          </Text>
        </Animated.View>

        {/* ━━━ AUTH CARD ━━━ */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg }, cardAnimStyle]}>
          {/* Mode Tabs */}
          <View style={[styles.modeTabs, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <Pressable
              onPress={() => { if (!isLogin) handleToggle(); }}
              style={[
                styles.modeTab,
                isLogin && { backgroundColor: C.accent },
              ]}
            >
              <Ionicons name="log-in-outline" size={16} color={isLogin ? '#fff' : sub} />
              <Text style={[styles.modeTabText, { color: isLogin ? '#fff' : sub }]}>Login</Text>
            </Pressable>
            <Pressable
              onPress={() => { if (isLogin) handleToggle(); }}
              style={[
                styles.modeTab,
                !isLogin && { backgroundColor: C.emerald },
              ]}
            >
              <Ionicons name="person-add-outline" size={16} color={!isLogin ? '#fff' : sub} />
              <Text style={[styles.modeTabText, { color: !isLogin ? '#fff' : sub }]}>Sign Up</Text>
            </Pressable>
          </View>

          {/* Greeting */}
          <View style={styles.greetingSection}>
            <Text style={[styles.greeting, { color: txt }]}>
              {isLogin ? 'Welcome back! 👋' : 'Create Account ✨'}
            </Text>
            <Text style={[styles.greetingSub, { color: sub }]}>
              {isLogin
                ? 'Sign in to manage your messages'
                : 'Join Walleto to get started'}
            </Text>
          </View>

          {/* ━━━ NAME FIELD (Signup only) ━━━ */}
          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: sub }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Ionicons name="person-outline" size={18} color={sub} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: txt }]}
                  placeholder="Enter your name"
                  placeholderTextColor={sub}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* ━━━ EMAIL FIELD ━━━ */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: sub }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="mail-outline" size={18} color={sub} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: txt }]}
                placeholder="you@example.com"
                placeholderTextColor={sub}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* ━━━ PASSWORD FIELD ━━━ */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: sub }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="lock-closed-outline" size={18} color={sub} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: txt, flex: 1 }]}
                placeholder="Min 8 chars, A-z + special"
                placeholderTextColor={sub}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={sub}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ━━━ ERROR MESSAGE ━━━ */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ━━━ SUBMIT BUTTON ━━━ */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit
                  ? (isLogin ? C.accent : C.emerald)
                  : (darkMode ? '#2d2d40' : '#d1d5db'),
              },
              canSubmit && {
                shadowColor: isLogin ? C.accent : C.emerald,
                shadowOpacity: 0.4,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 16,
                elevation: 8,
              },
            ]}
            onPress={handleAuth}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitInner}>
                <Ionicons
                  name={isLogin ? 'arrow-forward-circle' : 'checkmark-circle'}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.submitText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ━━━ TOGGLE LINK ━━━ */}
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: sub }]}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={handleToggle}>
              <Text style={[styles.toggleLink, { color: isLogin ? C.emerald : C.accent }]}>
                {isLogin ? ' Sign Up' : ' Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ━━━ FOOTER ━━━ */}
        <Text style={[styles.footer, { color: sub }]}>
          Secure · Fast · Smart
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // ── Decorative Circles ──
  gradientCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -60,
  },
  circle2: {
    width: 250,
    height: 250,
    bottom: -40,
    left: -80,
  },

  // ── Logo ──
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    marginBottom: 16,
  },
  logoGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 35,
    backgroundColor: '#6366f120',
  },
  logoImage: {
    width: 85,
    height: 85,
    borderRadius: 20,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandTag: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // ── Card ──
  card: {
    borderRadius: 28,
    padding: 28,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },

  // ── Mode Tabs ──
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 13,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Greeting ──
  greetingSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 8,
    marginLeft: 4,
  },

  // ── Error ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef444412',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // ── Submit ──
  submitBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Toggle ──
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '800',
  },

  // ── Footer ──
  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 24,
    letterSpacing: 1.5,
  },
});
