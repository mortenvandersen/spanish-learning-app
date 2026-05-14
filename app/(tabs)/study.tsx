import { StyleSheet, Text, View } from 'react-native';

export default function StudyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Study</Text>
      <Text style={styles.body}>Flashcards will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  body: { fontSize: 16, opacity: 0.7 },
});
