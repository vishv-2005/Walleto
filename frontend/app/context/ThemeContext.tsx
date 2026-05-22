import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Design Tokens ──────────────────────────────────────────────
export const LIGHT = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  surface: '#E2E8F0',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#334155',
  subText: '#64748B',
  muted: '#94A3B8',
  // Brand
  primary: '#25D366',
  primaryDark: '#1DA851',
  primaryLight: '#D1FAE5',
  primaryGhost: 'rgba(37,211,102,0.08)',
  accent: '#6366F1',
  accentLight: '#EEF2FF',
  accentGhost: 'rgba(99,102,241,0.08)',
  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  // Shadows
  shadow: 'rgba(15,23,42,0.06)',
  shadowMd: 'rgba(15,23,42,0.10)',
  // Tab bar
  tabBg: 'rgba(255,255,255,0.92)',
  tabBorder: '#E2E8F0',
  tabActive: '#25D366',
  tabInactive: '#94A3B8',
  // Gradient orbs
  orb1: 'rgba(37,211,102,0.12)',
  orb2: 'rgba(99,102,241,0.10)',
  orb3: 'rgba(59,130,246,0.08)',
  // Header
  headerBg: 'rgba(248,250,252,0.88)',
  // Category colors
  order: '#22C55E',
  complaint: '#EF4444',
  inquiry: '#3B82F6',
  feedback: '#F59E0B',
  invalid: '#64748B',
};

export const DARK = {
  bg: '#020617',
  card: '#0F172A',
  cardAlt: '#1E293B',
  surface: '#1E293B',
  border: '#1E293B',
  borderLight: '#0F172A',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  subText: '#94A3B8',
  muted: '#64748B',
  // Brand
  primary: '#25D366',
  primaryDark: '#1DA851',
  primaryLight: '#052E16',
  primaryGhost: 'rgba(37,211,102,0.12)',
  accent: '#818CF8',
  accentLight: '#1E1B4B',
  accentGhost: 'rgba(129,140,248,0.12)',
  // Semantic
  success: '#34D399',
  warning: '#FBBF24',
  warningLight: '#422006',
  error: '#F87171',
  errorLight: '#450A0A',
  info: '#60A5FA',
  infoLight: '#172554',
  // Shadows
  shadow: 'rgba(0,0,0,0.3)',
  shadowMd: 'rgba(0,0,0,0.5)',
  // Tab bar
  tabBg: 'rgba(2,6,23,0.92)',
  tabBorder: '#1E293B',
  tabActive: '#25D366',
  tabInactive: '#475569',
  // Gradient orbs
  orb1: 'rgba(37,211,102,0.08)',
  orb2: 'rgba(99,102,241,0.06)',
  orb3: 'rgba(59,130,246,0.05)',
  // Header
  headerBg: 'rgba(2,6,23,0.88)',
  // Category colors
  order: '#34D399',
  complaint: '#F87171',
  inquiry: '#60A5FA',
  feedback: '#FBBF24',
  invalid: '#64748B',
};

export type Theme = typeof LIGHT;

export const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: any) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem('darkMode');
    if (saved === 'true') setDarkMode(true);
  };

  const toggleTheme = async () => {
    const value = !darkMode;
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  };

  const t: Theme = darkMode ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, t }}>
      {children}
    </ThemeContext.Provider>
  );
};