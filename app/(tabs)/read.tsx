import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePassages } from '@/hooks/usePassages';
import {
  useMarkRead,
  useMarkUnread,
  useReadPassageIds,
} from '@/hooks/usePassageReads';
import { describeError } from '@/services/errors';
import type { Passage } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];
type FilterMode = 'all' | 'unread' | 'read';
type SortMode = 'order' | 'level';

const FILTER_OPTIONS: { label: string; value: FilterMode }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'Order', value: 'order' },
  { label: 'Level', value: 'level' },
];

const LEVEL_ORDER: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };

export default function ReadScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const { data, isLoading, error } = usePassages();
  const { data: readIdsList } = useReadPassageIds();
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();

  const readIds = useMemo(() => new Set(readIdsList ?? []), [readIdsList]);
  const lastMutationError: unknown = markRead.error ?? markUnread.error;

  const [filter, setFilter] = useState<FilterMode>('unread');
  const [sort, setSort] = useState<SortMode>('order');

  const visiblePassages = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter(p => {
      if (filter === 'all') return true;
      const isRead = readIds.has(p.id);
      return filter === 'read' ? isRead : !isRead;
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'level') {
        const la = LEVEL_ORDER[a.level] ?? 99;
        const lb = LEVEL_ORDER[b.level] ?? 99;
        if (la !== lb) return la - lb;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [data, filter, sort, readIds]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.text }}>Failed to load passages.</Text>
        <Text style={[styles.errorDetail, { color: palette.muted }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={[styles.empty, { color: palette.muted }]}>No passages yet.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={styles.controls}>
        <PillGroup
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          palette={palette}
        />
        <PillGroup
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          palette={palette}
        />
        {lastMutationError ? (
          <Text style={[styles.errorDetail, { color: palette.muted }]}>
            {describeError(lastMutationError)}
          </Text>
        ) : null}
      </View>

      {visiblePassages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: palette.muted }]}>
            {filter === 'unread'
              ? 'Nothing unread. Switch filter to see all.'
              : filter === 'read'
                ? 'Nothing marked read yet.'
                : 'No passages.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visiblePassages}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <PassageRow
              passage={item}
              isRead={readIds.has(item.id)}
              palette={palette}
              onOpen={() => router.push(`/reader/${item.id}`)}
              onToggle={() => {
                if (readIds.has(item.id)) {
                  markUnread.mutate(item.id);
                } else {
                  markRead.mutate(item.id);
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function PassageRow({
  passage,
  isRead,
  palette,
  onOpen,
  onToggle,
}: {
  passage: Passage;
  isRead: boolean;
  palette: Palette;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowBody, pressed && { opacity: 0.6 }]}
      >
        <Text
          style={[
            styles.title,
            { color: isRead ? palette.muted : palette.text },
            isRead && styles.titleRead,
          ]}
        >
          {passage.title}
        </Text>
        <Text style={[styles.level, { color: palette.muted }]}>{passage.level}</Text>
      </Pressable>
      <Pressable onPress={onToggle} hitSlop={8} style={styles.checkbox}>
        <Text
          style={[
            styles.checkboxText,
            { color: isRead ? palette.tint : palette.muted },
          ]}
        >
          {isRead ? '✓' : '○'}
        </Text>
      </Pressable>
    </View>
  );
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  palette,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  palette: Palette;
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
                borderColor: palette.border,
                backgroundColor: selected ? palette.tint : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: selected ? palette.background : palette.text },
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
  empty: { fontSize: 16, textAlign: 'center' },
  errorDetail: { fontSize: 12, marginTop: 4 },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  pillGroup: { flexDirection: 'row', gap: 6 },
  pill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16 },
  separator: { height: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rowBody: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  titleRead: { textDecorationLine: 'line-through' },
  level: { fontSize: 12, marginTop: 4, fontWeight: '500', letterSpacing: 0.5 },
  checkbox: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { fontSize: 22, fontWeight: '500' },
});
