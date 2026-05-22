import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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
import { AddWordModal } from '@/components/AddWordModal';
import {
  useMarkLessonDone,
  useMarkLessonUndone,
  useReadLessonSlugs,
} from '@/hooks/useLessonReads';
import { describeError } from '@/services/errors';
import { getLesson, getLessonMeta } from '@/services/lessons';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function LessonDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const lesson = slug ? getLesson(slug) : undefined;
  const meta = slug ? getLessonMeta(slug) : undefined;
  const markdownStyles = useMemo(() => buildMarkdownStyles(theme), [theme]);
  const { data: readSlugs } = useReadLessonSlugs();
  const markDone = useMarkLessonDone();
  const markUndone = useMarkLessonUndone();
  const isDone = !!slug && (readSlugs ?? []).includes(slug);
  const [addOpen, setAddOpen] = useState(false);

  if (!lesson || !meta) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Lesson not found.
        </Text>
      </View>
    );
  }

  const body = stripDuplicateTitle(lesson.body, lesson.title);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.root, { backgroundColor: theme.color.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text
            style={[
              theme.text.caption,
              { color: theme.color.textMuted },
            ]}
          >
            Lesson {meta.number} · Unit {meta.unit}
          </Text>
          <Pressable onPress={() => setAddOpen(true)} hitSlop={10}>
            <Text style={[theme.text.bodyEm, { color: theme.color.accent }]}>
              + Add card
            </Text>
          </Pressable>
        </View>
        <Text
          style={[
            theme.text.heading,
            { color: theme.color.text, marginTop: theme.space.xs },
          ]}
        >
          {lesson.title}
        </Text>

        {lesson.sourceUrl && (
          <Pressable
            onPress={() => Linking.openURL(lesson.sourceUrl)}
            style={{ marginTop: theme.space.sm }}
          >
            <Text style={[theme.text.tiny, { color: theme.color.accent }]}>
              studyspanish.com ↗
            </Text>
          </Pressable>
        )}

        <View style={{ marginTop: theme.space.xl }}>
          <Markdown style={markdownStyles}>{body}</Markdown>
        </View>

        <Pressable
          onPress={() => {
            if (!slug) return;
            if (isDone) markUndone.mutate(slug);
            else markDone.mutate(slug);
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

        {(markDone.error || markUndone.error) && (
          <Text
            style={[
              theme.text.tiny,
              {
                color: theme.color.danger,
                marginTop: theme.space.sm,
                textAlign: 'center',
              },
            ]}
          >
            {describeError(markDone.error ?? markUndone.error)}
          </Text>
        )}
      </ScrollView>

      <AddWordModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}

function stripDuplicateTitle(body: string, title: string): string {
  // The scraped body usually starts with an H1 that matches the lesson
  // title; we already render the title above, so drop it from the markdown
  // to avoid showing it twice.
  const match = body.match(/^#\s+.*\n+/);
  if (!match) return body;
  const heading = match[0].replace(/^#\s+/, '').trim();
  if (heading.replace(/\s+/g, ' ').toLowerCase() ===
      title.replace(/\s+/g, ' ').toLowerCase()) {
    return body.slice(match[0].length);
  }
  return body;
}

function buildMarkdownStyles(theme: Theme): Record<string, TextStyle | ViewStyle> {
  return {
    body: { ...theme.text.body, color: theme.color.text },
    text: { color: theme.color.text },
    textgroup: { color: theme.color.text },
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
    strong: { ...theme.text.bodyEm, color: theme.color.text },
    em: { ...theme.text.body, color: theme.color.text, fontStyle: 'italic' },
    link: { color: theme.color.accent, textDecorationLine: 'underline' },
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
    blockquote: {
      ...theme.text.body,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      borderLeftWidth: 3,
      borderLeftColor: theme.color.accent,
      paddingLeft: theme.space.md,
      paddingRight: theme.space.md,
      paddingVertical: theme.space.sm,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doneBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
