import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = (): string => {
  return 'https://walleto-v6ti.onrender.com';
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
    // Register push token
    const { registerForPushNotificationsAsync } = require('./pushNotifications');
    const pushToken = await registerForPushNotificationsAsync();
    if (pushToken) {
      await registerPushToken(email, pushToken).catch(console.error);
    }
  }
  return data;
}

export async function apiSignup(email: string, password: string, name?: string, businessName?: string) {
  const data = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, businessName }),
  });
  if (data.token) {
    await storeAuth(data.token, data.user);
    // Register push token
    const { registerForPushNotificationsAsync } = require('./pushNotifications');
    const pushToken = await registerForPushNotificationsAsync();
    if (pushToken) {
      await registerPushToken(email, pushToken).catch(console.error);
    }
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
  if (result.imageUrl && result.imageUrl.startsWith('/')) {
    result.imageUrl = `${API_BASE}${result.imageUrl}`;
  }
  return result;
}

// ── Notifications (New System) ───────────────────────────
export async function getNotifications(filters?: { type?: string; read?: boolean; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.read !== undefined) params.append('read', String(filters.read));
  if (filters?.limit) params.append('limit', String(filters.limit));
  const query = params.toString();
  return request(`/api/notifications${query ? `?${query}` : ''}`);
}

export async function getUnreadNotificationCount() {
  return request('/api/notifications/unread-count');
}

export async function markNotificationRead(id: string) {
  return request(`/api/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'PUT' });
}

export async function deleteNotification(id: string) {
  return request(`/api/notifications/${id}`, { method: 'DELETE' });
}

export async function deleteAllNotifications() {
  return request('/api/notifications', { method: 'DELETE' });
}

export async function registerPushToken(email: string, token: string) {
  return request('/api/push-token', {
    method: 'POST',
    body: JSON.stringify({ email, token }),
  });
}

// ── Notification Preferences ─────────────────────────────
export async function getNotificationPreferences(email: string) {
  return request(`/api/notification-preferences?email=${encodeURIComponent(email)}`);
}

export async function updateNotificationPreferences(email: string, preferences: Record<string, boolean>) {
  return request('/api/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify({ email, preferences }),
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
