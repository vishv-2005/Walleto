import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function TabLayout() {
  const { darkMode, toggleTheme } = useContext(ThemeContext);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: darkMode ? '#0f0f0f' : '#ffffff',
        },
        headerTintColor: darkMode ? '#ffffff' : '#111827',
        tabBarStyle: {
          backgroundColor: darkMode ? '#0f0f0f' : '#ffffff',
          borderTopColor: darkMode ? '#1f2937' : '#e5e7eb',
        },
        tabBarActiveTintColor: darkMode ? '#22c55e' : '#16a34a',
        tabBarInactiveTintColor: darkMode ? '#9ca3af' : '#6b7280',
        headerRight: () => (
          <TouchableOpacity
            onPress={toggleTheme}
            style={{ paddingHorizontal: 14, paddingVertical: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <Ionicons name={darkMode ? 'sunny' : 'moon'} size={20} color={darkMode ? '#22c55e' : '#16a34a'} />
          </TouchableOpacity>
        ),
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bar-chart" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}