import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine's localhost
// iOS simulator and web use localhost directly
const getBaseUrl = (): string => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://localhost:5000';
};

export const API_BASE = getBaseUrl();

// ── Helper ────────────────────────────────────────────────
async function request(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiSignup(email: string, password: string, name?: string) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
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

// ── Categorize ───────────────────────────────────────────
export async function categorizeMessage(message: string) {
  return request('/categorize', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
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
