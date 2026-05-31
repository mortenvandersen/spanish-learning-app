import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useDeleteUserPassage,
  useMarkUserPassageRead,
  useMarkUserPassageUnread,
  useUserPassages,
} from '@/hooks/useUserPassages';
import { describeError } from '@/services/errors';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { UserPassage } from '@/types';

type FilterMode = 'all' | 'unread' | 'read';

const FILTER_OPTIONS: { label: string; value: FilterMode }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

interface MyLibraryListProps {
  onAddPress: () => void;
}

export function MyLibraryList({ onAddPress }: MyLibraryListProps) {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, error } = useUserPassages();
  const deleteMutation = useDeleteUserPassage();
  const markRead = useMarkUserPassageRead();
  const markUnread = useMarkUserPassageUnread();
  const [filter, setFilter] = useState<FilterMode>('unread');

  const visible = useMemo(() => {
    if (!data) return [];
    return data.filter(p => {
      if (filter === 'all') return true;
      const isRead = p.readAt !== null;
      return filter === 'read' ? isRead : !isRead;
    });
  }, [data, filter]);

  const confirmDelete = (passage: UserPassage) => {
    Alert.alert(
      'Delete passage?',
      passage.title ?? passage.body.slice(0, 40),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(passage.id),
        },
      ],
    );
  };

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
          Failed to load library.
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  const isEmptyTotal = (data ?? []).length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <View style={styles.pillGroup}>
          {FILTER_OPTIONS.map(opt => {
            const selected = opt.value === filter;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setFilter(opt.value)}
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
        <Pressable
          onPress={onAddPress}
          style={[
            styles.addButton,
            {
              backgroundColor: theme.color.accent,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Text
            style={[
              theme.text.body,
              { color: '#FFFFFF', fontFamily: theme.fontFamily.sansMedium },
            ]}
          >
            + Add passage
          </Text>
        </Pressable>
      </View>

      {isEmptyTotal ? (
        <View style={styles.center}>
          <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
            Paste any Spanish text to build your library.
          </Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.center}>
          <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
            {filter === 'unread'
              ? 'Nothing unread. Switch filter to see all.'
              : 'Nothing marked read yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <LibraryRow
              passage={item}
              isRead={item.readAt !== null}
              theme={theme}
              onOpen={() => router.push(`/library/${item.id}`)}
              onToggle={() => {
                if (item.readAt) markUnread.mutate(item.id);
                else markRead.mutate(item.id);
              }}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function LibraryRow({
  passage,
  isRead,
  theme,
  onOpen,
  onToggle,
  onLongPress,
}: {
  passage: UserPassage;
  isRead: boolean;
  theme: Theme;
  onOpen: () => void;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const title = passage.title ?? deriveTitle(passage.body);
  const preview = passage.body.length > 80
    ? passage.body.slice(0, 80).trim() + '…'
    : passage.body;

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
        onLongPress={onLongPress}
        delayLongPress={400}
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
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[
            theme.text.caption,
            { color: theme.color.textMuted, marginTop: theme.space.xs },
          ]}
          numberOfLines={2}
        >
          {preview}
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

function deriveTitle(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40).trim() + '…';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  controls: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 },
  pillGroup: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6 },
  addButton: {
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
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
  rowBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
  rowPressed: { opacity: 0.6 },
  checkbox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});
