import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useConcept,
  useMarkConceptDone,
  useMarkConceptUndone,
  useReadConceptIds,
} from '@/hooks/useConcepts';
import { describeError } from '@/services/errors';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function ConceptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: concept, isLoading, error } = useConcept(id);
  const { data: readIdsList } = useReadConceptIds();
  const markDone = useMarkConceptDone();
  const markUndone = useMarkConceptUndone();

  const readIds = useMemo(() => new Set(readIdsList ?? []), [readIdsList]);
  const markdownStyles = useMemo(() => buildMarkdownStyles(theme), [theme]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (error || !concept) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Failed to load concept.
        </Text>
        {error && (
          <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 4 }]}>
            {describeError(error)}
          </Text>
        )}
      </View>
    );
  }

  const isDone = readIds.has(concept.id);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.root, { backgroundColor: theme.color.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[theme.text.heading, { color: theme.color.text }]}>
          {concept.title}
        </Text>

        {(concept.sourceEpisode || concept.sourceUrl) && (
          <View style={styles.sourceRow}>
            {concept.sourceEpisode && (
              <Text style={[theme.text.tiny, { color: theme.color.textMuted }]}>
                {concept.sourceEpisode}
              </Text>
            )}
            {concept.sourceUrl && (
              <Pressable onPress={() => Linking.openURL(concept.sourceUrl as string)}>
                <Text style={[theme.text.tiny, { color: theme.color.accent }]}>
                  Source ↗
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <Text
          style={[
            theme.text.body,
            { color: theme.color.textMuted, marginTop: theme.space.md, fontStyle: 'italic' },
          ]}
        >
          {concept.summary}
        </Text>

        <View style={{ marginTop: theme.space.xl }}>
          <Markdown style={markdownStyles}>{concept.body}</Markdown>
        </View>

        <Pressable
          onPress={() => {
            if (isDone) markUndone.mutate(concept.id);
            else markDone.mutate(concept.id);
          }}
          style={[
            styles.doneBtn,
            {
              backgroundColor: isDone ? theme.color.surface : theme.color.accent,
              borderRadius: theme.radius.md,
              marginTop: theme.space['2xl'],
            },
          ]}
        >
          <Text
            style={[
              theme.text.bodyEm,
              { color: isDone ? theme.color.text : '#FFFFFF' },
            ]}
          >
            {isDone ? '✓ Marked done — undo' : 'Mark done'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildMarkdownStyles(theme: Theme): Record<string, TextStyle | ViewStyle> {
  // react-native-markdown-display accepts a styles object keyed by markdown
  // block / inline names. We map them to the app's text variants so the
  // result matches the rest of the interface.
  return {
    body: {
      ...theme.text.body,
      color: theme.color.text,
    },
    paragraph: {
      ...theme.text.body,
      color: theme.color.text,
      marginTop: 0,
      marginBottom: theme.space.md,
    },
    heading1: {
      ...theme.text.heading,
      color: theme.color.text,
      marginTop: theme.space.xl,
      marginBottom: theme.space.sm,
    },
    heading2: {
      ...theme.text.subtitle,
      color: theme.color.text,
      marginTop: theme.space.lg,
      marginBottom: theme.space.xs,
    },
    heading3: {
      ...theme.text.bodyEm,
      color: theme.color.text,
      marginTop: theme.space.md,
      marginBottom: theme.space.xs,
    },
    strong: {
      ...theme.text.bodyEm,
      color: theme.color.text,
    },
    em: {
      ...theme.text.body,
      color: theme.color.text,
      fontStyle: 'italic',
    },
    link: {
      color: theme.color.accent,
      textDecorationLine: 'underline',
    },
    list_item: {
      ...theme.text.body,
      color: theme.color.text,
      marginBottom: theme.space.xs,
    },
    bullet_list_icon: {
      color: theme.color.textMuted,
      marginRight: theme.space.sm,
    },
    code_inline: {
      ...theme.text.body,
      color: theme.color.accent,
      backgroundColor: theme.color.surface,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      ...theme.text.tiny,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      padding: theme.space.md,
      borderRadius: theme.radius.md,
    },
    blockquote: {
      ...theme.text.body,
      color: theme.color.textMuted,
      borderLeftWidth: 3,
      borderLeftColor: theme.color.border,
      paddingLeft: theme.space.md,
      marginVertical: theme.space.sm,
      fontStyle: 'italic',
    },
    hr: {
      backgroundColor: theme.color.border,
      height: 1,
      marginVertical: theme.space.lg,
    },
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  doneBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
