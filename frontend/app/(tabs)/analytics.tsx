import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolateColor 
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { getStats } from '../services/api';

const screenWidth = Dimensions.get('window').width;

export default function Analytics() {

  const { darkMode } = useContext(ThemeContext);

  const [stats, setStats] = useState({
    total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0,
    orderPending: 0, orderInProgress: 0, orderCompleted: 0,
    complaintOpen: 0, complaintResolved: 0,
    inquiryNotAnswered: 0, inquiryAnswered: 0,
  });

  const [insights, setInsights] = useState({
    orders: '',
    inquiry: '',
    performance: '',
    quality: ''
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🎨 THEME
  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await getStats();
      setStats(data);

      // 🤖 INSIGHTS
      setInsights({
        orders:
          data.orders > 5
            ? "Orders are growing steadily."
            : "Order volume is low. Improve marketing.",

        inquiry:
          data.inquiries > 3
            ? "High customer engagement."
            : "Inquiry level is stable.",

        performance:
          data.orders > data.complaints
            ? "Business performance is strong."
            : "Complaints are high. Improve service.",

        quality:
          data.complaints < 3
            ? "Good service quality maintained."
            : "High complaint rate detected."
      });
    } catch (e) {
      console.log('Error loading analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const hasOrderData = (stats.orderCompleted + stats.orderPending + stats.orderInProgress) > 0;
  const hasComplaintData = (stats.complaintOpen + stats.complaintResolved) > 0;
  const hasInquiryData = (stats.inquiryNotAnswered + stats.inquiryAnswered) > 0;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#22c55e" />}
    >

      <Text style={[styles.title, { color: text }]}>
        Analytics
      </Text>

      <Text style={[styles.subtitle, { color: text }]}>
        Track your business performance and trends
      </Text>

      {/* CARDS */}
      <View style={styles.cards}>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Total Orders</Text>
          <Text style={[styles.number, { color: text }]}>{stats.orders}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Complaints</Text>
          <Text style={[styles.number, { color: text }]}>{stats.complaints}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Inquiries</Text>
          <Text style={[styles.number, { color: text }]}>{stats.inquiries}</Text>
        </View>

      </View>

      <View style={[styles.cards, { marginTop: 12 }]}>
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Feedback</Text>
          <Text style={[styles.number, { color: text }]}>{stats.feedback}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Invalid</Text>
          <Text style={[styles.number, { color: text }]}>{stats.invalid}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card, opacity: 0 }]} />
      </View>

      {/* BAR CHART */}
      <Text style={[styles.chartTitle, { color: text }]}>
        Data Overview
      </Text>

      <AnimatedBarChart 
        stats={stats} 
        darkMode={darkMode} 
        text={text} 
        card={card}
      />

      {/* STATUS PIE CHARTS GRID */}
      <View style={styles.grid}>
        
        {/* ORDERS PIE */}
        <View style={[styles.gridItem, { backgroundColor: card }]}>
          <Text style={[styles.gridTitle, { color: text }]}>Orders</Text>
          {hasOrderData ? (
            <PieChart
              data={[
                { name: "Done", population: stats.orderCompleted, color: "#22c55e", legendFontColor: text, legendFontSize: 10 },
                { name: "Progress", population: stats.orderInProgress, color: "#3b82f6", legendFontColor: text, legendFontSize: 10 },
                { name: "Pending", population: stats.orderPending, color: "#94a3b8", legendFontColor: text, legendFontSize: 10 }
              ]}
              width={screenWidth / 3} height={100} accessor="population"
              chartConfig={{ color: () => text }}
              hasLegend={false}
              paddingLeft="15"
              style={{ alignSelf: 'center' }}
            />
          ) : (
            <Text style={{ color: text, fontSize: 10 }}>No Data</Text>
          )}
        </View>

        {/* COMPLAINTS PIE */}
        <View style={[styles.gridItem, { backgroundColor: card }]}>
          <Text style={[styles.gridTitle, { color: text }]}>Complaints</Text>
          {hasComplaintData ? (
            <PieChart
              data={[
                { name: "Resolved", population: stats.complaintResolved, color: "#22c55e", legendFontColor: text, legendFontSize: 10 },
                { name: "Open", population: stats.complaintOpen, color: "#ef4444", legendFontColor: text, legendFontSize: 10 }
              ]}
              width={screenWidth / 3} height={100} accessor="population"
              chartConfig={{ color: () => text }}
              hasLegend={false}
              paddingLeft="15"
              style={{ alignSelf: 'center' }}
            />
          ) : (
            <Text style={{ color: text, fontSize: 10 }}>No Data</Text>
          )}
        </View>

        {/* INQUIRIES PIE */}
        <View style={[styles.gridItem, { backgroundColor: card }]}>
          <Text style={[styles.gridTitle, { color: text }]}>Inquiries</Text>
          {hasInquiryData ? (
            <PieChart
              data={[
                { name: "Answered", population: stats.inquiryAnswered, color: "#22c55e", legendFontColor: text, legendFontSize: 10 },
                { name: "Pending", population: stats.inquiryNotAnswered, color: "#facc15", legendFontColor: text, legendFontSize: 10 }
              ]}
              width={screenWidth / 3} height={100} accessor="population"
              chartConfig={{ color: () => text }}
              hasLegend={false}
              paddingLeft="15"
              style={{ alignSelf: 'center' }}
            />
          ) : (
            <Text style={{ color: text, fontSize: 10 }}>No Data</Text>
          )}
        </View>

      </View>

      {/* INSIGHTS */}
      <View style={styles.insights}>

        <View style={[styles.insight, { backgroundColor: '#d1fae5' }]}>
          <Text style={styles.insightTitle}>Orders Growth</Text>
          <Text>{insights.orders}</Text>
        </View>

        <View style={[styles.insight, { backgroundColor: '#dbeafe' }]}>
          <Text style={styles.insightTitle}>Inquiry Trend</Text>
          <Text>{insights.inquiry}</Text>
        </View>

        <View style={[styles.insight, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.insightTitle}>Performance</Text>
          <Text>{insights.performance}</Text>
        </View>

        <View style={[styles.insight, { backgroundColor: '#ede9fe' }]}>
          <Text style={styles.insightTitle}>Quality</Text>
          <Text>{insights.quality}</Text>
        </View>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold'
  },

  subtitle: {
    marginBottom: 20
  },

  cards: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  card: {
    width: '32%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2
  },

  number: {
    fontSize: 20,
    fontWeight: 'bold'
  },

  chartTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold'
  },

  insights: {
    marginTop: 20
  },

  insight: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },

  insightTitle: {
    fontWeight: 'bold',
    marginBottom: 5
  },

  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  gridItem: {
    width: '31%',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5
  }

});

// 📊 COMPONENT: ANIMATED BAR CHART
function AnimatedBarChart({ stats, darkMode, text, card }) {
  const chartData = [
    { label: "Orders", value: stats.orders, color: "#3b82f6" },
    { label: "Complaints", value: stats.complaints, color: "#ef4444" },
    { label: "Inquiries", value: stats.inquiries, color: "#f59e0b" },
    { label: "Feedback", value: stats.feedback, color: "#10b981" },
    { label: "Invalid", value: stats.invalid, color: "#6b7280" },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value), 10);

  return (
    <View style={[chartStyles.container, { backgroundColor: card }]}>
      <View style={chartStyles.chartArea}>
        {chartData.map((item, index) => (
          <BarItem 
            key={index} 
            item={item} 
            maxValue={maxValue} 
            darkMode={darkMode} 
            text={text} 
          />
        ))}
      </View>
      <View style={chartStyles.labels}>
        {chartData.map((item, index) => (
          <Text key={index} style={[chartStyles.labelText, { color: text }]}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function BarItem({ item, maxValue, text }) {
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    height.value = withTiming((item.value / maxValue) * 150, { duration: 1000 });
  }, [item.value, maxValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(1.1, { duration: 150 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(0.8);
  };

  return (
    <View style={chartStyles.barContainer}>
      <Text style={[chartStyles.valueText, { color: text }]}>{item.value}</Text>
      <Pressable 
        onPressIn={handlePressIn} 
        onPressOut={handlePressOut}
        style={{ alignItems: 'center' }}
      >
        <Animated.View 
          style={[
            chartStyles.bar, 
            { backgroundColor: item.color }, 
            animatedStyle
          ]} 
        />
      </Pressable>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 20,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  chartArea: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  barContainer: {
    alignItems: 'center',
    width: '18%',
  },
  bar: {
    width: '100%',
    minWidth: 30,
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    width: '18%',
    textAlign: 'center',
  },
  valueText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  }
});