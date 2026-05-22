import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LessonList } from '@/components/LessonList';
import {
  useConcepts,
  useMarkConceptDone,
  useMarkConceptUndone,
  useReadConceptIds,
} from '@/hooks/useConcepts';
import { describeError } from '@/services/errors';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { Concept } from '@/types';

type TopMode = 'concepts' | 'lessons';
type FilterMode = 'all' | 'todo' | 'done';
type SortMode = 'order' | 'recent';

const TOP_OPTIONS: { label: string; value: TopMode }[] = [
  { label: 'Concepts', value: 'concepts' },
  { label: 'Lessons', value: 'lessons' },
];

const FILTER_OPTIONS: { label: string; value: FilterMode }[] = [
  { label: 'All', value: 'all' },
  { label: 'To do', value: 'todo' },
  { label: 'Done', value: 'done' },
];

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'Order', value: 'order' },
  { label: 'Recent', value: 'recent' },
];

export default function ConceptsScreen() {
  const theme = useTheme();
  const [topMode, setTopMode] = useState<TopMode>('concepts');

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.root, { backgroundColor: theme.color.bg }]}
    >
      <View style={styles.topToggle}>
        <PillGroup
          options={TOP_OPTIONS}
          value={topMode}
          onChange={setTopMode}
          theme={theme}
        />
      </View>
      {topMode === 'concepts' ? <ConceptsBody /> : <LessonList />}
    </SafeAreaView>
  );
}

function ConceptsBody() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, error } = useConcepts();
  const { data: readIdsList } = useReadConceptIds();
  const markDone = useMarkConceptDone();
  const markUndone = useMarkConceptUndone();

  const readIds = useMemo(() => new Set(readIdsList ?? []), [readIdsList]);
  const lastMutationError: unknown = markDone.error ?? markUndone.error;

  const [filter, setFilter] = useState<FilterMode>('todo');
  const [sort, setSort] = useState<SortMode>('recent');

  const visible = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter(c => {
      if (filter === 'all') return true;
      const isDone = readIds.has(c.id);
      return filter === 'done' ? isDone : !isDone;
    });
    return [...filtered].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sort === 'recent' ? -cmp : cmp;
    });
  }, [data, filter, sort, readIds]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Failed to load concepts.
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 4 }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
          No concepts yet.{'\n'}Load some via the SQL editor.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.controls}>
        <PillGroup
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          theme={theme}
        />
        <PillGroup
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          theme={theme}
        />
        {lastMutationError ? (
          <Text style={[theme.text.tiny, { color: theme.color.textMuted }]}>
            {describeError(lastMutationError)}
          </Text>
        ) : null}
      </View>

      {visible.length === 0 ? (
        <View style={styles.center}>
          <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
            {filter === 'todo'
              ? 'Nothing to do. Switch filter to see all.'
              : filter === 'done'
                ? 'Nothing marked done yet.'
                : 'No concepts.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ConceptRow
              concept={item}
              isDone={readIds.has(item.id)}
              theme={theme}
              onOpen={() => router.push(`/concept/${item.id}`)}
              onToggle={() => {
                if (readIds.has(item.id)) {
                  markUndone.mutate(item.id);
                } else {
                  markDone.mutate(item.id);
                }
              }}
            />
          )}
        />
      )}
    </>
  );
}

function ConceptRow({
  concept,
  isDone,
  theme,
  onOpen,
  onToggle,
}: {
  concept: Concept;
  isDone: boolean;
  theme: Theme;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowPressed]}
      >
        <Text
          style={[
            theme.text.subtitle,
            {
              color: isDone ? theme.color.textMuted : theme.color.text,
              textDecorationLine: isDone ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {concept.title}
        </Text>
        <Text
          style={[
            theme.text.tiny,
            { color: theme.color.textMuted, marginTop: theme.space.xs },
          ]}
          numberOfLines={2}
        >
          {concept.summary}
        </Text>
        {concept.sourceEpisode && (
          <Text
            style={[
              theme.text.caption,
              { color: theme.color.textDim, marginTop: theme.space.xs },
            ]}
          >
            {concept.sourceEpisode}
          </Text>
        )}
      </Pressable>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={[styles.checkbox, { borderLeftColor: theme.color.border }]}
      >
        <Text
          style={{
            fontSize: 22,
            color: isDone ? theme.color.accent : theme.color.textDim,
          }}
        >
          {isDone ? '✓' : '○'}
        </Text>
      </Pressable>
    </View>
  );
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  theme,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.pillGroup}>
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.pill,
              {
                backgroundColor: selected ? theme.color.accent : theme.color.surface,
                borderRadius: theme.radius.full,
              },
            ]}
          >
            <Text
              style={[
                theme.text.tiny,
                {
                  color: selected ? '#FFFFFF' : theme.color.text,
                  fontFamily: theme.fontFamily.sansMedium,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  topToggle: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  controls: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 },
  pillGroup: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6 },
  list: { padding: 16 },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  rowBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
  rowPressed: { opacity: 0.6 },
  checkbox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});
