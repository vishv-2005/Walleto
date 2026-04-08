import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

type Item = {
  name: string;
  status?: string;
};

export default function Analytics() {

  const { darkMode } = useContext(ThemeContext);

  const [orders, setOrders] = useState<Item[]>([]);
  const [complaints, setComplaints] = useState<Item[]>([]);
  const [inquiries, setInquiries] = useState<Item[]>([]);
   const [logistics, setLogistics] = useState<Item[]>([]);
   const [others, setOthers] = useState<Item[]>([]);

  const [insights, setInsights] = useState({
    orders: '',
    inquiry: '',
    performance: '',
    quality: ''
  });

  // 🎨 THEME
  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  // 🔥 LOAD DATA (ONLY ONCE)
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {

    const stored = await AsyncStorage.getItem('categoriesData');

    const data = stored
      ? JSON.parse(stored)
      : { orders: [], complaints: [], inquiries: [], logistics: [], others: [] };

    const normalize = (arr: any[]): Item[] =>
      Array.isArray(arr)
        ? arr
            .map((x) =>
              typeof x === 'string' ? ({ name: x } as Item) : ({ name: String(x?.name ?? ''), status: x?.status } as Item)
            )
            .filter((x) => x.name)
        : [];

    const ordersData: Item[] = normalize(data.orders || []);
    const complaintsData: Item[] = normalize(data.complaints || []);
    const inquiriesData: Item[] = normalize(data.inquiries || []);
    const logisticsData: Item[] = normalize(data.logistics || []);
    const othersData: Item[] = normalize(data.others || []);

    setOrders(ordersData);
    setComplaints(complaintsData);
    setInquiries(inquiriesData);
    setLogistics(logisticsData);
    setOthers(othersData);

    // 🤖 INSIGHTS
    setInsights({
      orders:
        ordersData.length > 5
          ? "Orders are growing steadily."
          : "Order volume is low. Improve marketing.",

      inquiry:
        inquiriesData.length > 3
          ? "High customer engagement."
          : "Inquiry level is stable.",

      performance:
        ordersData.length > complaintsData.length
          ? "Business performance is strong."
          : "Complaints are high. Improve service.",

      quality:
        complaintsData.length < 3
          ? "Good service quality maintained."
          : "High complaint rate detected."
    });
  };

  // 📊 STATUS COUNTS
  const completed = orders.filter(o => o.status === "Completed").length;
  const pending = orders.filter(o => (o.status ?? "Pending") === "Pending").length;
  const inProgress = orders.filter(o => o.status === "In Progress").length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>

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
          <Text style={[styles.number, { color: text }]}>{orders.length}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Complaints</Text>
          <Text style={[styles.number, { color: text }]}>{complaints.length}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Inquiries</Text>
          <Text style={[styles.number, { color: text }]}>{inquiries.length}</Text>
        </View>

      </View>

      <View style={[styles.cards, { marginTop: 12 }]}>
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Logistics</Text>
          <Text style={[styles.number, { color: text }]}>{logistics.length}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={{ color: text }}>Others</Text>
          <Text style={[styles.number, { color: text }]}>{others.length}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card, opacity: 0 }]} />
      </View>

      {/* BAR CHART */}
      <Text style={[styles.chartTitle, { color: text }]}>
        Data Overview
      </Text>

      <BarChart
        data={{
          labels: ["Orders", "Complaints", "Inquiries", "Logistics", "Others"],
          datasets: [{
            data: [
              orders.length,
              complaints.length,
              inquiries.length,
              logistics.length,
              others.length
            ]
          }]
        }}
        width={screenWidth - 40}
        height={220}
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

      <PieChart
        data={[
          {
            name: "Completed",
            population: completed,
            color: "#22c55e",
            legendFontColor: text,
            legendFontSize: 12
          },
          {
            name: "Pending",
            population: pending,
            color: "#facc15",
            legendFontColor: text,
            legendFontSize: 12
          },
          {
            name: "In Progress",
            population: inProgress,
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
          color: () => "#000"
        }}
        style={{ borderRadius: 12 }}
      />

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