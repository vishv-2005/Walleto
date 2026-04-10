import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

// ━━━ COLOR SYSTEM (matches all pages) ━━━
const C = {
  accent: '#6366f1',
  accentMuted: '#818cf8',
  dark: {
    bg: '#0f0f14',
    border: '#1e1e2e',
    inactive: '#475569',
    text: '#f1f5f9',
  },
  light: {
    bg: '#ffffff',
    border: '#e2e8f0',
    inactive: '#94a3b8',
    text: '#0f172a',
  },
};

export default function TabLayout() {
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const theme = darkMode ? C.dark : C.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.bg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: darkMode ? C.dark.border : C.light.border,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: -0.3,
        },
        headerTintColor: theme.text,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: darkMode ? C.dark.border : C.light.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: theme.inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              paddingHorizontal: 14, paddingVertical: 8,
              marginRight: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <Ionicons
              name={darkMode ? 'sunny' : 'moon'}
              size={20}
              color={C.accent}
            />
          </TouchableOpacity>
        ),
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}