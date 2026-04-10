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
import { PieChart, BarChart } from 'react-native-chart-kit';
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

const palette = {
  indigo: '#4f46e5',
  slate: '#94a3b8',
  bg: '#f8fafc',
  card: '#ffffff'
};

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
    }, 2000);
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

  const hasOrderData = stats.orders > 0;
  const hasComplaintData = stats.complaints > 0;
  const hasInquiryData = stats.inquiries > 0;

  const displayOrders = stats;
  const displayComplaints = stats;
  const displayInquiries = stats;

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

        <View style={[styles.card, { backgroundColor: card, borderColor: text, borderWidth: 1.8, opacity: 0.95 }]}>
          <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>Orders</Text>
          <Text style={[styles.number, { color: text }]}>{stats.orders}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card, borderColor: text, borderWidth: 1.8, opacity: 0.95 }]}>
          <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>Complaints</Text>
          <Text style={[styles.number, { color: text }]}>{stats.complaints}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: card, borderColor: text, borderWidth: 1.8, opacity: 0.95 }]}>
          <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>Inquiries</Text>
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

      <View style={{
        width: screenWidth - 24,
        alignSelf: 'center',
        backgroundColor: card,
        borderRadius: 24,
        paddingVertical: 20,
        paddingHorizontal: 10,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      }}>
        <Text style={{ color: text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 15 }}>

        </Text>
        <BarChart
          data={{
            labels: ["Orders", "Complaints", "Inquiries", "Feedback", "Invalid"],
            datasets: [{
              data: [stats.orders, stats.complaints, stats.inquiries, stats.feedback, stats.invalid],
              colors: [
                (opacity = 1) => `#4f46e5`,
                (opacity = 1) => `#4f46e5`,
                (opacity = 1) => `#4f46e5`,
                (opacity = 1) => `#4f46e5`,
                (opacity = 1) => `#94a3b8`,
              ]
            }]
          }}
          width={screenWidth * 0.8} height={200}
          yAxisLabel="" yAxisSuffix=""
          fromZero showValuesOnTopOfBars
          flatColor={true}
          withCustomBarColorFromData={true}
          withInnerLines={false}
          withHorizontalLabels={false}
          withVerticalLabels={false}
          chartConfig={{
            backgroundColor: card,
            backgroundGradientFrom: card,
            backgroundGradientTo: card,
            decimalPlaces: 0,
            color: (opacity = 1) => text,
            labelColor: (opacity = 1) => text,
            barPercentage: 0.9,
            propsForLabels: {
              fontSize: 10,
              fontWeight: '700'
            }
          }}
          style={{ borderRadius: 16, alignSelf: 'center' }}
        />
      </View>

      {/* STATUS PIE CHARTS GRID */}
      <View style={styles.grid}>

        {/* ORDERS PIE */}
        {/* ORDERS PIE */}
        <View style={[styles.gridItem, { backgroundColor: card, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)' }]}>
          <Text style={[styles.gridTitle, { color: text }]}>Orders</Text>
          {hasOrderData ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <PieChart
                data={[
                  { name: "Done", population: displayOrders.orderCompleted, color: palette.indigo, legendFontColor: text, legendFontSize: 8 },
                  { name: "Progress", population: displayOrders.orderInProgress, color: "#818cf8", legendFontColor: text, legendFontSize: 8 },
                  { name: "Pending", population: displayOrders.orderPending, color: "#cbd5e1", legendFontColor: text, legendFontSize: 8 }
                ]}
                width={screenWidth / 5.5} height={80} accessor="population"
                backgroundColor="transparent"
                chartConfig={{ color: (opacity = 1) => text }}
                hasLegend={false}
                paddingLeft="12"
              />
              <View style={styles.legendContainer}>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: palette.indigo }]} /><Text style={[styles.dotText, { color: text }]}>{displayOrders.orderCompleted} Done</Text>
                </View>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: "#818cf8" }]} /><Text style={[styles.dotText, { color: text }]}>{displayOrders.orderInProgress} In Progress</Text>
                </View>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: "#cbd5e1" }]} /><Text style={[styles.dotText, { color: text }]}>{displayOrders.orderPending} Pending</Text>
                </View>
              </View>
            </View>
          ) : <Text style={{ color: text, fontSize: 10, marginTop: 10 }}>No Data</Text>}
        </View>

        {/* COMPLAINTS PIE */}
        <View style={[styles.gridItem, { backgroundColor: card, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)' }]}>
          <Text style={[styles.gridTitle, { color: text }]}>Complaints</Text>
          {hasComplaintData ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <PieChart
                data={[
                  { name: "Res", population: displayComplaints.complaintResolved, color: palette.indigo, legendFontColor: text, legendFontSize: 8 },
                  { name: "Opn", population: displayComplaints.complaintOpen, color: "#cbd5e1", legendFontColor: text, legendFontSize: 8 }
                ]}
                width={screenWidth / 5.5} height={80} accessor="population"
                backgroundColor="transparent"
                chartConfig={{ color: (opacity = 1) => text }}
                hasLegend={false}
                paddingLeft="12"
              />
              <View style={styles.legendContainer}>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: palette.indigo }]} /><Text style={[styles.dotText, { color: text }]}>{displayComplaints.complaintResolved} Resolved</Text>
                </View>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: "#cbd5e1" }]} /><Text style={[styles.dotText, { color: text }]}>{displayComplaints.complaintOpen} Open</Text>
                </View>
              </View>
            </View>
          ) : <Text style={{ color: text, fontSize: 10, marginTop: 10 }}>No Data</Text>}
        </View>

        {/* INQUIRIES PIE */}
        <View style={[styles.gridItem, { backgroundColor: card, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)' }]}>
          <Text style={[styles.gridTitle, { color: text }]}>Inquiries</Text>
          {hasInquiryData ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <PieChart
                data={[
                  { name: "Ans", population: displayInquiries.inquiryAnswered, color: palette.indigo, legendFontColor: text, legendFontSize: 8 },
                  { name: "Pnd", population: displayInquiries.inquiryNotAnswered, color: "#cbd5e1", legendFontColor: text, legendFontSize: 8 }
                ]}
                width={screenWidth / 5.5} height={80} accessor="population"
                backgroundColor="transparent"
                chartConfig={{ color: (opacity = 1) => text }}
                hasLegend={false}
                paddingLeft="12"
              />
              <View style={styles.legendContainer}>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: palette.indigo }]} /><Text style={[styles.dotText, { color: text }]}>{displayInquiries.inquiryAnswered} Answered</Text>
                </View>
                <View style={styles.miniLegend}>
                  <View style={[styles.dot, { backgroundColor: "#cbd5e1" }]} /><Text style={[styles.dotText, { color: text }]}>{displayInquiries.inquiryNotAnswered} Not Answered</Text>
                </View>
              </View>
            </View>
          ) : <Text style={{ color: text, fontSize: 10, marginTop: 10 }}>No Data</Text>}
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
    justifyContent: 'center',
    marginTop: 20
  },
  gridItem: {
    width: '31.5%',
    marginHorizontal: '0.5%',
    padding: 8,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  gridTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6
  },
  legendContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 4
  },
  miniLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    marginVertical: 1
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4
  },
  dotText: {
    fontSize: 7,
    fontWeight: '700'
  }

});