import { useRouter } from 'expo-router';
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
  useUserPassages,
} from '@/hooks/useUserPassages';
import { describeError } from '@/services/errors';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { UserPassage } from '@/types';

interface MyLibraryListProps {
  onAddPress: () => void;
}

export function MyLibraryList({ onAddPress }: MyLibraryListProps) {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, error } = useUserPassages();
  const deleteMutation = useDeleteUserPassage();

  const handleDelete = (passage: UserPassage) => {
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

  const passages = data ?? [];

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onAddPress}
        style={[
          styles.addButton,
          {
            backgroundColor: theme.color.accent,
            borderRadius: theme.radius.lg,
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

      {passages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[theme.text.body, { color: theme.color.textMuted, textAlign: 'center' }]}>
            Paste any Spanish text to build your library.
          </Text>
        </View>
      ) : (
        <FlatList
          data={passages}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <LibraryRow
              passage={item}
              theme={theme}
              onOpen={() => router.push(`/library/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function LibraryRow({
  passage,
  theme,
  onOpen,
  onDelete,
}: {
  passage: UserPassage;
  theme: Theme;
  onOpen: () => void;
  onDelete: () => void;
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
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowPressed]}
      >
        <Text
          style={[theme.text.subtitle, { color: theme.color.text }]}
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
        onPress={onDelete}
        hitSlop={8}
        style={[styles.deleteCell, { borderLeftColor: theme.color.border }]}
      >
        <Text style={{ fontSize: 18, color: theme.color.textDim }}>×</Text>
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
  addButton: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  rowBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
  rowPressed: { opacity: 0.6 },
  deleteCell: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});
