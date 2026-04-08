import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {

  const { darkMode } = useContext(ThemeContext);

  const [tasks, setTasks] = useState([
    { id: 1, title: 'Follow up with ABC Corp', done: false },
    { id: 2, title: 'Resolve complaint', done: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    ));
  };

  const bg = darkMode ? '#0f0f0f' : '#f5f7fa';
  const card = darkMode ? '#1c1c1e' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        <Text style={[styles.title, { color: text }]}>
          Dashboard
        </Text>

        {/* PREMIUM CARDS */}
        <View style={styles.cards}>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: text }}>Total Orders</Text>
            <Text style={[styles.number, { color: text }]}>145</Text>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={{ color: text }}>Complaints</Text>
            <Text style={[styles.number, { color: text }]}>8</Text>
          </View>
        </View>

        <Text style={[styles.taskTitle, { color: text }]}>
          {"Today's Tasks"}
        </Text>

        {tasks.map(task => (
          <View key={task.id} style={[styles.task, { backgroundColor: card }]}>
            <Text style={{ color: text }}>{task.title}</Text>
            <Switch
              value={task.done}
              onValueChange={() => toggleTask(task.id)}
            />
          </View>
        ))}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10
  },

  cards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },

  card: {
    width: '48%',
    padding: 20,
    borderRadius: 20,
    elevation: 5,
  },

  number: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 5
  },

  taskTitle: {
    marginTop: 25,
    fontSize: 20,
    fontWeight: '600'
  },

  task: {
    marginTop: 12,
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});