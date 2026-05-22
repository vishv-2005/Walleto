import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Rect, Text as SvgText, G, Line } from 'react-native-svg';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { getStats } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Analytics() {
  const { darkMode, t } = useContext(ThemeContext);
  const [stats, setStats] = useState<any>({
    total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0,
    orderPending: 0, orderInProgress: 0, orderCompleted: 0,
    complaintOpen: 0, complaintResolved: 0,
    inquiryNotAnswered: 0, inquiryAnswered: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try { setStats(await getStats()); }
    catch { }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) {
    return (
      <View style={[st.container, { backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[st.container, { backgroundColor: t.bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={t.primary} />}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={[st.title, { color: t.text }]}>Analytics</Text>
        <Text style={[st.subtitle, { color: t.subText }]}>Track your business performance</Text>
      </Animated.View>

      {/* Top Stats Row */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={st.topStats}>
        {[
          { label: 'Total', value: stats.total, color: '#6366F1', icon: 'chatbubbles' },
          { label: 'Orders', value: stats.orders, color: t.order, icon: 'cart' },
          { label: 'Complaints', value: stats.complaints, color: t.complaint, icon: 'alert-circle' },
          { label: 'Inquiries', value: stats.inquiries, color: t.inquiry, icon: 'help-circle' },
        ].map((s) => (
          <View key={s.label} style={[st.topStatCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[st.topStatIcon, { backgroundColor: `${s.color}12` }]}>
              <Ionicons name={s.icon as any} size={16} color={s.color} />
            </View>
            <Text style={[st.topStatValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[st.topStatLabel, { color: t.subText }]}>{s.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Bar Chart */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Text style={[st.sectionTitle, { color: t.text, paddingHorizontal: 20 }]}>Category Breakdown</Text>
        <View style={[st.chartCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <CustomBarChart
            data={[
              { label: 'Orders', value: stats.orders, color: t.order },
              { label: 'Complaints', value: stats.complaints, color: t.complaint },
              { label: 'Inquiries', value: stats.inquiries, color: t.inquiry },
              { label: 'Feedback', value: stats.feedback, color: t.feedback },
              { label: 'Invalid', value: stats.invalid, color: t.invalid },
            ]}
            darkMode={darkMode}
            t={t}
          />
        </View>
      </Animated.View>

      {/* Donut Charts */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <Text style={[st.sectionTitle, { color: t.text, paddingHorizontal: 20 }]}>Status Breakdown</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {/* Orders Donut */}
          <View style={[st.donutCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[st.donutTitle, { color: t.text }]}>Orders</Text>
            {stats.orders > 0 ? (
              <DonutChart
                size={110} strokeWidth={12}
                data={[
                  { value: stats.orderCompleted, color: t.order, label: 'Done' },
                  { value: stats.orderInProgress, color: '#F59E0B', label: 'In Progress' },
                  { value: stats.orderPending, color: darkMode ? '#334155' : '#E2E8F0', label: 'Pending' },
                ]}
                textColor={t.text} subTextColor={t.subText}
              />
            ) : <Text style={[st.noData, { color: t.subText }]}>No data</Text>}
          </View>

          {/* Complaints Donut */}
          <View style={[st.donutCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[st.donutTitle, { color: t.text }]}>Complaints</Text>
            {stats.complaints > 0 ? (
              <DonutChart
                size={110} strokeWidth={12}
                data={[
                  { value: stats.complaintResolved, color: t.order, label: 'Resolved' },
                  { value: stats.complaintOpen, color: t.complaint, label: 'Open' },
                ]}
                textColor={t.text} subTextColor={t.subText}
              />
            ) : <Text style={[st.noData, { color: t.subText }]}>No data</Text>}
          </View>

          {/* Inquiries Donut */}
          <View style={[st.donutCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[st.donutTitle, { color: t.text }]}>Inquiries</Text>
            {stats.inquiries > 0 ? (
              <DonutChart
                size={110} strokeWidth={12}
                data={[
                  { value: stats.inquiryAnswered, color: t.inquiry, label: 'Answered' },
                  { value: stats.inquiryNotAnswered, color: darkMode ? '#334155' : '#E2E8F0', label: 'Pending' },
                ]}
                textColor={t.text} subTextColor={t.subText}
              />
            ) : <Text style={[st.noData, { color: t.subText }]}>No data</Text>}
          </View>
        </ScrollView>
      </Animated.View>

      {/* AI Insights */}
      <Animated.View entering={FadeInDown.delay(400).springify()} style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <Text style={[st.sectionTitle, { color: t.text }]}>AI Insights</Text>
        {[
          {
            icon: 'trending-up', color: t.order,
            title: 'Order Trend',
            desc: stats.orders > 5 ? 'Orders are growing steadily. Great momentum!' : 'Order volume is low. Consider improving marketing.',
          },
          {
            icon: 'shield-checkmark', color: t.inquiry,
            title: 'Service Quality',
            desc: stats.complaints < 3 ? 'Good service quality maintained. Keep it up!' : 'High complaint rate detected. Review your service quality.',
          },
          {
            icon: 'pulse', color: '#F59E0B',
            title: 'Business Performance',
            desc: stats.orders > stats.complaints ? 'Business performance is strong. Orders exceed complaints.' : 'Complaints are high relative to orders. Take action.',
          },
        ].map((insight, i) => (
          <Animated.View key={insight.title} entering={FadeInRight.delay(450 + i * 80).springify()}>
            <View style={[st.insightCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[st.insightIcon, { backgroundColor: `${insight.color}12` }]}>
                <Ionicons name={insight.icon as any} size={20} color={insight.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.insightTitle, { color: t.text }]}>{insight.title}</Text>
                <Text style={[st.insightDesc, { color: t.subText }]}>{insight.desc}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

// ── Custom Bar Chart (SVG) with gridlines ─────────────────────────
function CustomBarChart({ data, darkMode, t }: { data: { label: string; value: number; color: string }[]; darkMode: boolean; t: any }) {
  const chartWidth = SCREEN_WIDTH - 72;
  const chartHeight = 180;
  const barWidth = Math.min(40, (chartWidth - 20) / data.length - 14);
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const gridLines = 4;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={chartHeight + 45}>
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = (i / gridLines) * chartHeight;
          const val = Math.round(maxValue - (i / gridLines) * maxValue);
          return (
            <G key={`grid-${i}`}>
              <Line x1={0} y1={y} x2={chartWidth} y2={y}
                stroke={darkMode ? '#1E293B' : '#F1F5F9'} strokeWidth={1} />
              <SvgText x={-2} y={y + 4} textAnchor="end" fontSize="9"
                fontWeight="500" fill={t.muted}>{val}</SvgText>
            </G>
          );
        })}

        {data.map((item, i) => {
          const x = (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2;
          const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
          const y = chartHeight - barHeight;
          const radius = Math.min(8, barWidth / 2);

          return (
            <G key={item.label}>
              {/* Bar background */}
              <Rect x={x} y={0} width={barWidth} height={chartHeight}
                rx={radius} fill={darkMode ? '#1E293B' : '#F1F5F9'} />
              {/* Colored bar */}
              <Rect x={x} y={y} width={barWidth} height={barHeight}
                rx={radius} fill={item.color} opacity={0.9} />
              {/* Value text */}
              <SvgText x={x + barWidth / 2} y={y - 8}
                textAnchor="middle" fontSize="12" fontWeight="700"
                fill={item.color}>{item.value}</SvgText>
              {/* Label text */}
              <SvgText x={x + barWidth / 2} y={chartHeight + 18}
                textAnchor="middle" fontSize="10" fontWeight="600"
                fill={t.muted}>{item.label}</SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Donut Chart (SVG) ──────────────────────────────────────────
function DonutChart({ size, strokeWidth, data, textColor, subTextColor }: {
  size: number; strokeWidth: number;
  data: { value: number; color: string; label: string }[];
  textColor: string; subTextColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  let accumulated = 0;

  // Find largest segment for percentage
  const largest = data.reduce((a, b) => a.value > b.value ? a : b, data[0]);
  const pct = total > 0 ? Math.round((largest.value / total) * 100) : 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {data.map((item, i) => {
          const percentage = total > 0 ? item.value / total : 0;
          const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
          const rotation = total > 0 ? (accumulated / total) * 360 - 90 : -90;
          accumulated += item.value;
          return (
            <Circle key={i} cx={cx} cy={cy} r={radius}
              stroke={item.color} strokeWidth={strokeWidth} fill="none"
              strokeDasharray={strokeDasharray} strokeLinecap="round"
              transform={`rotate(${rotation} ${cx} ${cy})`} />
          );
        })}
        <SvgText x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle"
          fontSize="18" fontWeight="800" fill={textColor}>{total}</SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="600" fill={subTextColor}>total</SvgText>
      </Svg>
      {/* Legend */}
      <View style={{ marginTop: 10, gap: 4 }}>
        {data.map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: textColor }}>
              {item.value} {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginBottom: 16, marginTop: 2, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 20, letterSpacing: -0.3 },

  topStats: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  topStatCard: {
    flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center',
  },
  topStatIcon: {
    width: 30, height: 30, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  topStatValue: { fontSize: 20, fontWeight: '800', letterSpacing: -1 },
  topStatLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  chartCard: {
    marginHorizontal: 20, borderRadius: 20, padding: 20,
    borderWidth: 1, shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },

  donutCard: {
    width: 170, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center',
  },
  donutTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  noData: { fontSize: 11, marginTop: 30 },

  insightCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12,
  },
  insightIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  insightTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  insightDesc: { fontSize: 12, lineHeight: 18 },
});