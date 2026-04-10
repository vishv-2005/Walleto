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
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ThemeContext } from '../context/ThemeContext';
import { getStats } from '../services/api';

const screenWidth = Dimensions.get('window').width;

export default function Analytics() {

  const { darkMode } = useContext(ThemeContext);

  const [stats, setStats] = useState({
    total: 0, orders: 0, complaints: 0, inquiries: 0, feedback: 0, invalid: 0,
    completed: 0, pending: 0, inProgress: 0,
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
    }, 1500);
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

  const hasPieData = (stats.completed + stats.pending + stats.inProgress) > 0;

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

      <BarChart
        data={{
          labels: ["Orders", "Complaints", "Inquiries", "Feedback", "Invalid"],
          datasets: [{
            data: [
              stats.orders,
              stats.complaints,
              stats.inquiries,
              stats.feedback,
              stats.invalid
            ]
          }]
        }}
        width={screenWidth - 40}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: card,
          backgroundGradientTo: card,
          color: () => darkMode ? "#4CAF50" : "#3b82f6",
          labelColor: () => text
        }}
        style={{ borderRadius: 12 }}
      />

      {/* PIE CHART */}
      <Text style={[styles.chartTitle, { color: text }]}>
        Status Distribution
      </Text>

      {hasPieData ? (
        <PieChart
          data={[
            {
              name: "Completed",
              population: stats.completed,
              color: "#22c55e",
              legendFontColor: text,
              legendFontSize: 12
            },
            {
              name: "Pending",
              population: stats.pending,
              color: "#facc15",
              legendFontColor: text,
              legendFontSize: 12
            },
            {
              name: "In Progress",
              population: stats.inProgress,
              color: "#3b82f6",
              legendFontColor: text,
              legendFontSize: 12
            }
          ]}
          width={screenWidth - 40}
          height={220}
          accessor="population"
          chartConfig={{
            backgroundGradientFrom: card,
            backgroundGradientTo: card,
            color: () => "#ffffffff"
          }}
          style={{ borderRadius: 12 }}
        />
      ) : (
        <View style={[styles.card, { backgroundColor: card, marginTop: 10, alignItems: 'center' }]}>
          <Text style={{ color: text }}>No status data yet</Text>
        </View>
      )}

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
  }

});