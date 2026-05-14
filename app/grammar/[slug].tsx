import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function GrammarTopicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{slug}</Text>
      <Text style={styles.body}>Grammar topic page (markdown) will render here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  body: { fontSize: 16, opacity: 0.7 },
});
