import { Link } from 'expo-router';
import { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from './context/ThemeContext';

export default function ModalScreen() {
  const { darkMode } = useContext(ThemeContext);

  const bg = darkMode ? '#121212' : '#fff';
  const text = darkMode ? '#fff' : '#000';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>This is a modal</Text>

      <Link href="/(tabs)" dismissTo style={styles.link}>
        <Text style={{ color: '#22c55e', fontWeight: '700' }}>Go to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
  },
});

