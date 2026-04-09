import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiSignup } from '../services/api';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function Auth() {
  const router = useRouter();
  const { darkMode } = useContext(ThemeContext);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      if (!email || !password) {
        setError('Please fill all fields');
        return;
      }

      if (!validateEmail(cleanedEmail)) {
        setError('Invalid email format');
        return;
      }

      if (cleanedPassword.length < 6) {
        setError('Password must be at least 6 characters');
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
          router.replace('/(tabs)');
        } catch (err: any) {
          setError(err.message || 'Invalid email or password');
        }
      } else {
        try {
          await apiSignup(cleanedEmail, cleanedPassword);
          Alert.alert('Success', 'Account created! Please login.');
          setIsLogin(true);
          setEmail('');
          setPassword('');
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

  const bg = darkMode ? '#0f0f0f' : '#f5f7fa';
  const card = darkMode ? '#1c1c1e' : '#ffffff';
  const text = darkMode ? '#ffffff' : '#111827';
  const subText = darkMode ? '#a1a1aa' : '#6b7280';
  const border = darkMode ? '#2b2b2f' : '#e5e7eb';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.inner, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.logo, { color: text }]}>Walleto</Text>

        <Text style={[styles.title, { color: text }]}>
          {isLogin ? 'Login' : 'Sign Up'}
        </Text>

        <Text style={[styles.subtitle, { color: subText }]}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: subText }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: darkMode ? '#111115' : '#fff', color: text, borderColor: border }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: subText }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  backgroundColor: darkMode ? '#111115' : '#fff',
                  color: text,
                  borderColor: border,
                },
              ]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={subText}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: subText }]}>Minimum 6 characters</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.button,
            (!email || !password || loading) && { backgroundColor: '#9ca3af' },
          ]}
          onPress={handleAuth}
          disabled={!email || !password || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.toggle, { color: subText }]}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <Text
            style={styles.link}
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? ' Sign up' : ' Login'}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  inner: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  error: {
    color: '#ef4444',
    marginTop: 10,
  },
  button: {
    width: '100%',
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  toggle: {
    marginTop: 14,
    textAlign: 'center',
  },
  link: {
    color: '#22c55e',
    fontWeight: '700',
  },
});

