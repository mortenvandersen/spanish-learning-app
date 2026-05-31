import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import {
  useMarkLessonDone,
  useMarkLessonUndone,
  useReadLessonSlugs,
} from '@/hooks/useLessonReads';
import { getLessonsByUnit, type LessonInUnit } from '@/services/lessons';
import { useTheme, type Theme } from '@/theme/useTheme';

type Section = {
  unit: number;
  title: string;
  availableCount: number;
  totalCount: number;
  doneCount: number;
  data: LessonInUnit[];
};

export function LessonList() {
  const theme = useTheme();
  const router = useRouter();
  const { data: readSlugs } = useReadLessonSlugs();
  const markDone = useMarkLessonDone();
  const markUndone = useMarkLessonUndone();

  const doneSet = useMemo(() => new Set(readSlugs ?? []), [readSlugs]);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const toggleUnit = (unit: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit);
      else next.add(unit);
      return next;
    });
  };

  const sections = useMemo<Section[]>(() => {
    return getLessonsByUnit().map(u => ({
      unit: u.unit,
      title: u.title,
      availableCount: u.lessons.filter(l => l.available).length,
      totalCount: u.lessons.length,
      doneCount: u.lessons.filter(l => doneSet.has(l.slug)).length,
      // Hide items when collapsed so SectionList renders only the header.
      data: expanded.has(u.unit) ? u.lessons : [],
    }));
  }, [doneSet, expanded]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.slug}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderSectionHeader={({ section }) => {
        const isExpanded = expanded.has(section.unit);
        return (
          <Pressable
            onPress={() => toggleUnit(section.unit)}
            style={({ pressed }) => [
              styles.sectionHeader,
              {
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text
                style={[
                  theme.text.tiny,
                  {
                    color: theme.color.textMuted,
                    fontFamily: theme.fontFamily.sansSemibold,
                    width: 16,
                  },
                ]}
              >
                {isExpanded ? '▾' : '▸'}
              </Text>
              <Text
                style={[
                  theme.text.caption,
                  { color: theme.color.textMuted },
                ]}
              >
                {section.title}
              </Text>
            </View>
            <Text
              style={[
                theme.text.caption,
                { color: theme.color.textMuted },
              ]}
            >
              {section.doneCount}/{section.availableCount} done · {section.availableCount}/{section.totalCount}
            </Text>
          </Pressable>
        );
      }}
      SectionSeparatorComponent={({ leadingItem }) =>
        leadingItem ? <View style={styles.sectionGap} /> : null
      }
      renderItem={({ item }) => (
        <LessonRow
          lesson={item}
          isDone={doneSet.has(item.slug)}
          theme={theme}
          onOpen={() =>
            item.available ? router.push(`/lesson/${item.slug}`) : undefined
          }
          onToggle={() => {
            if (doneSet.has(item.slug)) {
              markUndone.mutate(item.slug);
            } else {
              markDone.mutate(item.slug);
            }
          }}
        />
      )}
    />
  );
}

function LessonRow({
  lesson,
  isDone,
  theme,
  onOpen,
  onToggle,
}: {
  lesson: LessonInUnit;
  isDone: boolean;
  theme: Theme;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const disabled = !lesson.available;
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Pressable
        onPress={disabled ? undefined : onOpen}
        style={({ pressed }) => [
          styles.rowBody,
          pressed && !disabled ? styles.rowPressed : null,
        ]}
      >
        <Text
          style={[
            theme.text.caption,
            { color: theme.color.textMuted, width: 32 },
          ]}
        >
          {lesson.number}
        </Text>
        <Text
          style={[
            theme.text.body,
            {
              color: isDone ? theme.color.textMuted : theme.color.text,
              textDecorationLine: isDone ? 'line-through' : 'none',
              flex: 1,
            },
          ]}
          numberOfLines={2}
        >
          {lesson.title}
        </Text>
      </Pressable>
      <Pressable
        onPress={disabled ? undefined : onToggle}
        hitSlop={8}
        style={[styles.checkbox, { borderLeftColor: theme.color.border }]}
      >
        <Text
          style={{
            fontSize: 22,
            color: disabled
              ? theme.color.textDim
              : isDone
                ? theme.color.accent
                : theme.color.textDim,
          }}
        >
          {disabled ? '—' : isDone ? '✓' : '○'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionGap: { height: 14 },
  separator: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  rowPressed: { opacity: 0.6 },
  checkbox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});
