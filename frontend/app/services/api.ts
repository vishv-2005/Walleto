import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = (): string => {
  // Use Expo's hostUri to dynamically get the computer's local IP address (e.g. 192.168.x.x)
  // This allows the Expo Go app on a physical phone to connect to the backend server.
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    return `http://${host}:5000`;
  }
  
  // Fallbacks for simulators and web
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://localhost:5000';
};

export const API_BASE = getBaseUrl();

// ── Token Management ─────────────────────────────────────
const TOKEN_KEY = 'walleto_jwt_token';
const USER_KEY = 'walleto_user';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function storeAuth(token: string, user: any): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

// ── Helper ────────────────────────────────────────────────
async function request(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`;
  try {
    const token = await getStoredToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err: any) {
    console.log(`API Error [${path}]:`, err.message);
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────
export async function apiLogin(email: string, password: string) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    await storeAuth(data.token, data.user);
  }
  return data;
}

export async function apiSignup(email: string, password: string, name?: string) {
  const data = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  if (data.token) {
    await storeAuth(data.token, data.user);
  }
  return data;
}

export async function apiLogout() {
  await clearAuth();
}

// ── Categories ───────────────────────────────────────────
export async function getCategories() {
  return request('/api/categories');
}

export async function addCategoryItem(category: string, name: string, status?: string) {
  return request(`/api/categories/${category}`, {
    method: 'POST',
    body: JSON.stringify({ name, status }),
  });
}

export async function updateCategoryItem(category: string, id: string, updates: { name?: string; status?: string }) {
  return request(`/api/categories/${category}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCategoryItem(category: string, id: string) {
  return request(`/api/categories/${category}/${id}`, {
    method: 'DELETE',
  });
}

// ── Stats ────────────────────────────────────────────────
export async function getStats() {
  return request('/api/stats');
}

// ── Messages ─────────────────────────────────────────────
export async function getMessages() {
  return request('/api/messages');
}

export async function updateMessageStatus(id: string, status: string) {
  return request(`/api/messages/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Categorize ───────────────────────────────────────────
export async function categorizeMessage(message: string) {
  return request('/categorize', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// ── Marketing Post Generation ─────────────────────────────
export async function generateMarketingPost(businessDescription: string, festival?: string, offer?: string) {
  const result = await request('/api/generate-post', {
    method: 'POST',
    body: JSON.stringify({ businessDescription, festival, offer }),
  });
  // The server returns a relative imageUrl like /api/proxy-image?...
  // Prepend the base URL so the Image component can load it
  if (result.imageUrl && result.imageUrl.startsWith('/')) {
    result.imageUrl = `${API_BASE}${result.imageUrl}`;
  }
  return result;
}

// ── Notifications ────────────────────────────────────────
export async function getNotifications() {
  return request('/api/notifications');
}

export async function toggleNotificationRead(id: string) {
  return request(`/api/notifications/${id}/read`, {
    method: 'PUT',
  });
}

// ── Profile ──────────────────────────────────────────────
export async function getProfile(email: string) {
  return request(`/api/profile?email=${encodeURIComponent(email)}`);
}

export async function updateProfile(email: string, updates: { name?: string; newEmail?: string }) {
  return request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ email, ...updates }),
  });
}
