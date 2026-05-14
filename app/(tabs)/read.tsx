import { useRouter } from 'expo-router';
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
import { describeError } from '@/services/errors';

export default function ReadScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const { data, isLoading, error } = usePassages();

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
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: palette.background }}>
      <FlatList
        data={data}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/reader/${item.id}`)}
            style={[styles.card, { borderColor: palette.border }]}
          >
            <Text style={[styles.title, { color: palette.text }]}>{item.title}</Text>
            <Text style={[styles.level, { color: palette.muted }]}>{item.level}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  empty: { fontSize: 16 },
  errorDetail: { fontSize: 12, marginTop: 4 },
  list: { padding: 16 },
  separator: { height: 12 },
  card: { borderWidth: 1, borderRadius: 8, padding: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  level: { fontSize: 12, marginTop: 4, fontWeight: '500', letterSpacing: 0.5 },
});
