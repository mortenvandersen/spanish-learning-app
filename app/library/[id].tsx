import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PassageReader } from '@/components/PassageReader';
import { useUserPassage } from '@/hooks/useUserPassages';
import { describeError } from '@/services/errors';
import { useTheme } from '@/theme/useTheme';

export default function LibraryReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: passage, isLoading, error } = useUserPassage(id);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (error || !passage) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Failed to load passage.
        </Text>
        {error && (
          <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
            {describeError(error)}
          </Text>
        )}
      </View>
    );
  }

  const title = passage.title ?? deriveTitle(passage.body);

  return (
    <PassageReader
      title={title}
      body={passage.body}
      sourcePassageId={null}
    />
  );
}

function deriveTitle(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40).trim() + '…';
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
