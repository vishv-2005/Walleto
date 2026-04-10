import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ThemeContext } from '../context/ThemeContext';
import { getStats } from '../services/api';

const screenWidth = Dimensions.get('window').width;

// ━━━ PREMIUM COLOR SYSTEM ━━━
const colors = {
  // Semantic category colors
  orders:     { primary: '#10b981', light: '#d1fae5', dark: '#064e3b', muted: '#6ee7b7' },
  complaints: { primary: '#f59e0b', light: '#fef3c7', dark: '#78350f', muted: '#fcd34d' },
  inquiries:  { primary: '#3b82f6', light: '#dbeafe', dark: '#1e3a5f', muted: '#93c5fd' },
  feedback:   { primary: '#8b5cf6', light: '#ede9fe', dark: '#4c1d95', muted: '#c4b5fd' },
  invalid:    { primary: '#64748b', light: '#f1f5f9', dark: '#334155', muted: '#94a3b8' },
  // UI colors
  accent:     '#6366f1',
  success:    '#10b981',
  danger:     '#ef4444',
};

// ━━━ LIVE PULSE DOT ━━━
function LivePulse() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
      <Animated.View style={[{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: colors.success,
      }, animatedStyle]} />
      <Text style={{ color: colors.success, fontSize: 11, fontWeight: '600', marginLeft: 5 }}>LIVE</Text>
    </View>
  );
}

// ━━━ ANIMATED BAR ━━━
function AnimatedBar({ value, maxValue, color, label, index, darkMode }: any) {
  const height = useSharedValue(0);
  const barOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const targetHeight = maxValue > 0 ? (value / maxValue) * 140 : 0;
    height.value = withDelay(index * 100, withTiming(targetHeight, { duration: 800, easing: Easing.out(Easing.cubic) }));
    barOpacity.value = withDelay(index * 100, withTiming(1, { duration: 500 }));
  }, [value, maxValue]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: barOpacity.value,
    transform: [{ scaleX: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withTiming(1.08, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 200 }); }}
      style={barStyles.wrapper}
    >
      <Text style={[barStyles.valueLabel, { color: darkMode ? '#e2e8f0' : '#1e293b' }]}>
        {value}
      </Text>
      <Animated.View style={[barStyles.bar, { backgroundColor: color }, barStyle]} />
      <Text style={[barStyles.categoryLabel, { color: darkMode ? '#94a3b8' : '#64748b' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const barStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  bar: { width: '70%', borderRadius: 8, minHeight: 4 },
  valueLabel: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  categoryLabel: { fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center' },
});

// ━━━ STAT CARD ━━━
function StatCard({ title, value, color, icon, darkMode }: any) {
  const cardScale = useSharedValue(1);
  const numberOpacity = useSharedValue(0);

  useEffect(() => {
    numberOpacity.value = withTiming(1, { duration: 600 });
  }, [value]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const numberAnimStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
  }));

  const bg = darkMode ? '#1e1e2e' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#0f172a';
  const subColor = darkMode ? '#94a3b8' : '#64748b';

  return (
    <Pressable
      onPressIn={() => { cardScale.value = withTiming(0.96, { duration: 100 }); }}
      onPressOut={() => { cardScale.value = withTiming(1, { duration: 200 }); }}
    >
      <Animated.View style={[{
        backgroundColor: bg,
        borderRadius: 20,
        padding: 16,
        width: (screenWidth - 56) / 3,
        elevation: 6,
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: color,
      }, cardAnimStyle]}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: subColor, marginBottom: 8 }}>
          {icon} {title}
        </Text>
        <Animated.Text style={[{
          fontSize: 28, fontWeight: '900', color: textColor,
          letterSpacing: -1,
        }, numberAnimStyle]}>
          {value}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ━━━ PIE CARD ━━━
function PieCard({ title, data, accentColor, darkMode, screenWidth: sw }: any) {
  const bg = darkMode ? '#1e1e2e' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#0f172a';
  const hasData = data.some((d: any) => d.population > 0);

  return (
    <View style={{
      width: '31%',
      backgroundColor: bg,
      borderRadius: 20,
      padding: 10,
      elevation: 6,
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      borderTopWidth: 3,
      borderTopColor: accentColor,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: textColor, textAlign: 'center', marginBottom: 6 }}>
        {title}
      </Text>
      {hasData ? (
        <>
          <PieChart
            data={data}
            width={sw / 5} height={70} accessor="population"
            backgroundColor="transparent"
            chartConfig={{ color: () => textColor }}
            hasLegend={false}
            paddingLeft="8"
            absolute
          />
          <View style={{ marginTop: 6 }}>
            {data.map((item: any, idx: number) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, marginRight: 5 }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: darkMode ? '#cbd5e1' : '#475569', flex: 1 }} numberOfLines={1}>
                  {item.population} {item.name}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 10, color: darkMode ? '#475569' : '#94a3b8' }}>No Data</Text>
        </View>
      )}
    </View>
  );
}

// ━━━ INSIGHT CARD ━━━
function InsightCard({ icon, text: msg, tint, darkMode }: any) {
  const textColor = darkMode ? '#e2e8f0' : '#1e293b';
  const bg = darkMode ? tint + '20' : tint + '15';

  return (
    <View style={{
      backgroundColor: bg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderLeftWidth: 3,
      borderLeftColor: tint,
    }}>
      <Text style={{ fontSize: 18, marginRight: 10 }}>{icon}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: textColor, flex: 1 }}>{msg}</Text>
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Analytics() {
  const { darkMode } = useContext(ThemeContext);

  const [stats, setStats] = useState({
    total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0,
    orderPending: 0, orderInProgress: 0, orderCompleted: 0,
    complaintOpen: 0, complaintResolved: 0,
    inquiryNotAnswered: 0, inquiryAnswered: 0,
  });

  const [insights, setInsights] = useState<{ icon: string; text: string; tint: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bg = darkMode ? '#0f0f14' : '#f8fafc';
  const cardBg = darkMode ? '#1e1e2e' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#0f172a';
  const subColor = darkMode ? '#64748b' : '#94a3b8';

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await getStats();
      setStats(data);

      // Smart Insights
      const newInsights: { icon: string; text: string; tint: string }[] = [];

      if (data.orders > 5) {
        newInsights.push({ icon: '📈', text: `${data.orders} orders received — business is growing steadily.`, tint: colors.orders.primary });
      } else {
        newInsights.push({ icon: '📉', text: `Only ${data.orders} orders so far. Consider boosting marketing.`, tint: colors.complaints.primary });
      }

      if (data.complaints > data.orders * 0.5) {
        newInsights.push({ icon: '⚠️', text: `High complaint ratio (${data.complaints}). Service quality needs attention.`, tint: colors.danger });
      } else {
        newInsights.push({ icon: '✅', text: `Complaint rate is healthy at ${data.complaints}. Keep it up!`, tint: colors.success });
      }

      if (data.inquiries > 3) {
        newInsights.push({ icon: '💬', text: `${data.inquiries} inquiries show strong customer engagement.`, tint: colors.inquiries.primary });
      }

      setInsights(newInsights);
    } catch (e) {
      console.log('Error loading analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ width: 90, height: 90, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, marginBottom: 20 }}>
          <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 70, height: 70, borderRadius: 16 }} resizeMode="contain" />
        </View>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const barData = [
    { label: 'Orders',     value: stats.orders,     color: colors.orders.primary },
    { label: 'Complaints', value: stats.complaints, color: colors.complaints.primary },
    { label: 'Inquiries',  value: stats.inquiries,  color: colors.inquiries.primary },
    { label: 'Feedback',   value: stats.feedback,   color: colors.feedback.primary },
    { label: 'Invalid',    value: stats.invalid,    color: colors.invalid.primary },
  ];
  const maxBarValue = Math.max(...barData.map(d => d.value), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >

      {/* ━━━ HEADER ━━━ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, marginRight: 10 }}>
          <Image source={require('../../assets/images/walleto-logo.png')} style={{ width: 34, height: 34, borderRadius: 8 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.title, { color: textColor }]}>Analytics</Text>
            <LivePulse />
          </View>
          <Text style={{ color: subColor, fontSize: 13, fontWeight: '500', marginTop: 2 }}>
            Real-time business intelligence
          </Text>
        </View>
      </View>

      {/* ━━━ STAT CARDS — ROW 1 ━━━ */}
      <View style={styles.cardRow}>
        <StatCard title="Orders" value={stats.orders} color={colors.orders.primary} icon="📦" darkMode={darkMode} />
        <StatCard title="Complaints" value={stats.complaints} color={colors.complaints.primary} icon="⚠️" darkMode={darkMode} />
        <StatCard title="Inquiries" value={stats.inquiries} color={colors.inquiries.primary} icon="💬" darkMode={darkMode} />
      </View>

      {/* ━━━ STAT CARDS — ROW 2 ━━━ */}
      <View style={[styles.cardRow, { marginTop: 12 }]}>
        <StatCard title="Feedback" value={stats.feedback} color={colors.feedback.primary} icon="⭐" darkMode={darkMode} />
        <StatCard title="Invalid" value={stats.invalid} color={colors.invalid.primary} icon="🚫" darkMode={darkMode} />
        <StatCard title="Total" value={stats.total} color={colors.accent} icon="📊" darkMode={darkMode} />
      </View>

      {/* ━━━ SECTION DIVIDER ━━━ */}
      <View style={{ marginTop: 28, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, letterSpacing: -0.3 }}>
          Performance Overview
        </Text>
        <View style={{ height: 3, width: 40, backgroundColor: colors.accent, borderRadius: 2, marginTop: 6 }} />
      </View>

      {/* ━━━ ANIMATED BAR CHART ━━━ */}
      <View style={{
        backgroundColor: cardBg,
        borderRadius: 24,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, paddingTop: 10 }}>
          {barData.map((item, index) => (
            <AnimatedBar
              key={item.label}
              value={item.value}
              maxValue={maxBarValue}
              color={item.color}
              label={item.label}
              index={index}
              darkMode={darkMode}
            />
          ))}
        </View>
      </View>

      {/* ━━━ SECTION DIVIDER ━━━ */}
      <View style={{ marginTop: 28, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, letterSpacing: -0.3 }}>
          Status Breakdown
        </Text>
        <View style={{ height: 3, width: 40, backgroundColor: colors.accent, borderRadius: 2, marginTop: 6 }} />
      </View>

      {/* ━━━ PIE CHARTS ━━━ */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <PieCard
          title="Orders"
          accentColor={colors.orders.primary}
          darkMode={darkMode}
          screenWidth={screenWidth}
          data={[
            { name: 'Done', population: stats.orderCompleted, color: colors.orders.primary, legendFontColor: textColor, legendFontSize: 8 },
            { name: 'In Progress', population: stats.orderInProgress, color: colors.orders.muted, legendFontColor: textColor, legendFontSize: 8 },
            { name: 'Pending', population: stats.orderPending, color: darkMode ? '#334155' : '#e2e8f0', legendFontColor: textColor, legendFontSize: 8 },
          ]}
        />
        <PieCard
          title="Complaints"
          accentColor={colors.complaints.primary}
          darkMode={darkMode}
          screenWidth={screenWidth}
          data={[
            { name: 'Resolved', population: stats.complaintResolved, color: colors.complaints.primary, legendFontColor: textColor, legendFontSize: 8 },
            { name: 'Open', population: stats.complaintOpen, color: darkMode ? '#334155' : '#e2e8f0', legendFontColor: textColor, legendFontSize: 8 },
          ]}
        />
        <PieCard
          title="Inquiries"
          accentColor={colors.inquiries.primary}
          darkMode={darkMode}
          screenWidth={screenWidth}
          data={[
            { name: 'Answered', population: stats.inquiryAnswered, color: colors.inquiries.primary, legendFontColor: textColor, legendFontSize: 8 },
            { name: 'Pending', population: stats.inquiryNotAnswered, color: darkMode ? '#334155' : '#e2e8f0', legendFontColor: textColor, legendFontSize: 8 },
          ]}
        />
      </View>

      {/* ━━━ SECTION DIVIDER ━━━ */}
      <View style={{ marginTop: 28, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, letterSpacing: -0.3 }}>
          Smart Insights
        </Text>
        <View style={{ height: 3, width: 40, backgroundColor: colors.accent, borderRadius: 2, marginTop: 6 }} />
      </View>

      {/* ━━━ INSIGHTS ━━━ */}
      {insights.map((insight, idx) => (
        <InsightCard key={idx} icon={insight.icon} text={insight.text} tint={insight.tint} darkMode={darkMode} />
      ))}

    </ScrollView>
  );
}

// ━━━ STYLES ━━━
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});