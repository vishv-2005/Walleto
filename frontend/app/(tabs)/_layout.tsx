import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContext, useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { ThemeContext } from '../context/ThemeContext';
import { getUnreadNotificationCount } from '../services/api';

export default function TabLayout() {
  const { darkMode, toggleTheme, t } = useContext(ThemeContext);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const bellScale = useSharedValue(1);
  const bellRotate = useSharedValue(0);
  const toggleRotate = useSharedValue(0);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.count || 0);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (unreadCount > 0) {
      bellScale.value = withSpring(1.2, { damping: 3 }, () => {
        bellScale.value = withSpring(1);
      });
      bellRotate.value = withSequence(
        withTiming(-15, { duration: 80 }),
        withRepeat(withSequence(
          withTiming(15, { duration: 80 }),
          withTiming(-15, { duration: 80 }),
        ), 2),
        withTiming(0, { duration: 80 }),
      );
    }
  }, [unreadCount]);

  const bellAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bellScale.value },
      { rotate: `${bellRotate.value}deg` },
    ],
  }));

  const handleToggle = () => {
    toggleRotate.value = withSpring(darkMode ? 0 : 180, { damping: 12 });
    toggleTheme();
  };

  const toggleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${toggleRotate.value}deg` }],
  }));

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: t.headerBg,
          elevation: 0, shadowOpacity: 0, borderBottomWidth: 0,
        },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, letterSpacing: -0.3 },
        tabBarStyle: {
          backgroundColor: t.tabBg,
          borderTopColor: t.tabBorder,
          borderTopWidth: 0.5,
          paddingBottom: 6, paddingTop: 6, height: 62,
        },
        tabBarActiveTintColor: t.tabActive,
        tabBarInactiveTintColor: t.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10, fontWeight: '600', letterSpacing: 0.3,
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 8 }}>
            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => router.push('/modal')}
              style={styles.headerBtn}
              accessibilityRole="button" accessibilityLabel="Notifications"
            >
              <Animated.View style={bellAnimStyle}>
                <Ionicons
                  name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={unreadCount > 0 ? t.primary : t.muted}
                />
              </Animated.View>
              {unreadCount > 0 && (
                <View style={[styles.badge, { borderColor: t.bg }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity
              onPress={handleToggle}
              style={styles.headerBtn}
              accessibilityRole="button" accessibilityLabel="Toggle theme"
            >
              <Animated.View style={toggleAnimStyle}>
                <Ionicons
                  name={darkMode ? 'sunny' : 'moon'}
                  size={18}
                  color={darkMode ? '#FBBF24' : '#6366F1'}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="categories" options={{
        title: 'Categories',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="analytics" options={{
        title: 'Analytics',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="messages" options={{
        title: 'Messages',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="post" options={{
        title: 'Post',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'megaphone' : 'megaphone-outline'} size={22} color={color} />
        ),
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
        ),
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    paddingHorizontal: 10, paddingVertical: 8, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});