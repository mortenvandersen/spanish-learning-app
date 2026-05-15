import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConjugationStats } from '@/hooks/useConjugationCards';
import { useConcepts, useReadConceptIds } from '@/hooks/useConcepts';
import { useReadPassageIds } from '@/hooks/usePassageReads';
import { usePassages } from '@/hooks/usePassages';
import { useStudyStats } from '@/hooks/useUserWords';
import { useTheme, type Theme } from '@/theme/useTheme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: passages } = usePassages();
  const { data: readPassageIdsList } = useReadPassageIds();
  const { data: vocabStats } = useStudyStats();
  const { data: conjStats } = useConjugationStats();
  const { data: concepts } = useConcepts();
  const { data: readConceptIdsList } = useReadConceptIds();

  const unreadPassages = useMemo(() => {
    if (!passages) return null;
    const read = new Set(readPassageIdsList ?? []);
    return passages.filter(p => !read.has(p.id)).length;
  }, [passages, readPassageIdsList]);

  const totalDue = (vocabStats?.dueNow ?? 0) + (conjStats?.dueNow ?? 0);
  const totalDone = (vocabStats?.doneToday ?? 0) + (conjStats?.doneToday ?? 0);
  const studyReady = vocabStats !== undefined || conjStats !== undefined;

  const conceptsTodo = useMemo(() => {
    if (!concepts) return null;
    const done = new Set(readConceptIdsList ?? []);
    return concepts.filter(c => !done.has(c.id)).length;
  }, [concepts, readConceptIdsList]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[styles.root, { backgroundColor: theme.color.bg }]}
      >
        <View style={styles.brand}>
          <Text style={styles.emoji}>🇪🇸</Text>
          <Text style={[theme.text.display, { color: theme.color.text, marginTop: 8 }]}>
            Spanish Learning
          </Text>
        </View>

        <View style={styles.list}>
          <SectionCard
            icon="book"
            title="Read"
            subtitle={
              unreadPassages === null
                ? '…'
                : unreadPassages === 0
                  ? 'All caught up'
                  : `${unreadPassages} unread ${unreadPassages === 1 ? 'passage' : 'passages'}`
            }
            theme={theme}
            onPress={() => router.push('/read')}
          />
          <SectionCard
            icon="albums"
            title="Study"
            subtitle={
              !studyReady ? '…' : `${totalDue} due now · ${totalDone} done today`
            }
            theme={theme}
            onPress={() => router.push('/study')}
          />
          <SectionCard
            icon="bulb"
            title="Concepts"
            subtitle={
              conceptsTodo === null
                ? '…'
                : conceptsTodo === 0
                  ? 'All done'
                  : `${conceptsTodo} to do`
            }
            theme={theme}
            onPress={() => router.push('/concepts')}
          />
          <SectionCard
            icon="list"
            title="Grammar"
            subtitle="v1.5 — coming soon"
            theme={theme}
            muted
            onPress={() => router.push('/grammar')}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  theme,
  onPress,
  muted,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  theme: Theme;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={28}
        color={muted ? theme.color.textDim : theme.color.accent}
      />
      <View style={styles.cardBody}>
        <Text
          style={[
            theme.text.subtitle,
            { color: muted ? theme.color.textMuted : theme.color.text },
          ]}
        >
          {title}
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 2 }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.color.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  brand: { alignItems: 'center', paddingVertical: 40 },
  emoji: { fontSize: 56 },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  cardBody: { flex: 1 },
});
