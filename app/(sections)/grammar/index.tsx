import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export default function GrammarScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.color.bg }]}>
      <Text style={[theme.text.heading, { color: theme.color.text, marginBottom: 8 }]}>
        Grammar
      </Text>
      <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
        Grammar topic list will live here (v1.5).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
