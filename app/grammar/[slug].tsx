import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export default function GrammarTopicScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <View style={[styles.container, { backgroundColor: theme.color.bg }]}>
      <Text style={[theme.text.heading, { color: theme.color.text, marginBottom: 8 }]}>
        {slug}
      </Text>
      <Text style={[theme.text.body, { color: theme.color.textMuted }]}>
        Grammar topic page (markdown) will render here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
