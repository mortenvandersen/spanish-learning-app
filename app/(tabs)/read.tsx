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
import { MyLibraryList } from '@/components/MyLibraryList';
import {
  useMarkRead,
  useMarkUnread,
  useReadPassageIds,
} from '@/hooks/usePassageReads';
import { usePassages } from '@/hooks/usePassages';
import { describeError } from '@/services/errors';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { Passage } from '@/types';

type ReadMode = 'featured' | 'library';
type FilterMode = 'all' | 'unread' | 'read';

const MODE_OPTIONS: { label: string; value: ReadMode }[] = [
  { label: 'Featured', value: 'featured' },
  { label: 'My library', value: 'library' },
];

const FILTER_OPTIONS: { label: string; value: FilterMode }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

export default function ReadScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<ReadMode>('featured');
  const { data, isLoading, error } = usePassages();
  const { data: readIdsList } = useReadPassageIds();
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();

  const readIds = useMemo(() => new Set(readIdsList ?? []), [readIdsList]);
  const lastMutationError: unknown = markRead.error ?? markUnread.error;

  const [filter, setFilter] = useState<FilterMode>('unread');

  const visiblePassages = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter(p => {
      if (filter === 'all') return true;
      const isRead = readIds.has(p.id);
      return filter === 'read' ? isRead : !isRead;
    });
    return [...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [data, filter, readIds]);

  if (mode === 'library') {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: theme.color.bg }]}>
        <View style={styles.controls}>
          <ModeSwitch mode={mode} setMode={setMode} theme={theme} />
        </View>
        <MyLibraryList onAddPress={() => router.push('/library/new')} />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Failed to load passages.
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <Text style={[theme.text.body, { color: theme.color.textMuted }]}>
          No passages yet.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <View style={styles.controls}>
        <ModeSwitch mode={mode} setMode={setMode} theme={theme} />
        <PillGroup
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          theme={theme}
        />
        {lastMutationError ? (
          <Text style={[theme.text.tiny, { color: theme.color.textMuted }]}>
            {describeError(lastMutationError)}
          </Text>
        ) : null}
      </View>

      {visiblePassages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
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
              theme={theme}
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
  theme,
  onOpen,
  onToggle,
}: {
  passage: Passage;
  isRead: boolean;
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
              color: isRead ? theme.color.textMuted : theme.color.text,
              textDecorationLine: isRead ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {passage.title}
        </Text>
        <Text
          style={[
            theme.text.caption,
            { color: theme.color.textMuted, marginTop: theme.space.xs },
          ]}
        >
          {passage.level}
        </Text>
      </Pressable>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={[styles.checkbox, { borderLeftColor: theme.color.border }]}
      >
        <Text
          style={{
            fontSize: 22,
            color: isRead ? theme.color.accent : theme.color.textDim,
          }}
        >
          {isRead ? '✓' : '○'}
        </Text>
      </Pressable>
    </View>
  );
}

function ModeSwitch({
  mode,
  setMode,
  theme,
}: {
  mode: ReadMode;
  setMode: (m: ReadMode) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.modeRow}>
      {MODE_OPTIONS.map(opt => {
        const selected = opt.value === mode;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setMode(opt.value)}
            style={[
              styles.modeButton,
              {
                backgroundColor: selected ? theme.color.accent : theme.color.surface,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text
              style={[
                theme.text.bodyEm,
                {
                  color: selected ? '#FFFFFF' : theme.color.text,
                  textAlign: 'center',
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
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  pillGroup: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6 },
  list: { padding: 16 },
  separator: { height: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  rowBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 16 },
  rowPressed: { opacity: 0.6 },
  checkbox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});
