import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddWordModal } from '@/components/AddWordModal';
import { Colors } from '@/constants/Colors';
import { useDueUserWords, useReviewUserWord, useStudyStats } from '@/hooks/useUserWords';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { formatInterval, nextState, type Rating, type SrsState } from '@/services/srs';
import type { StudyStats, UserWord } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

const RATINGS: { label: string; value: Rating }[] = [
  { label: 'Again', value: 'again' },
  { label: 'Hard', value: 'hard' },
  { label: 'Good', value: 'good' },
  { label: 'Easy', value: 'easy' },
];

export default function StudyScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { data: dueWords, isLoading, error } = useDueUserWords();
  const { data: stats } = useStudyStats();
  const reviewMutation = useReviewUserWord();

  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Derive the queue from the latest server data minus what we've rated in
  // this session. Local state was causing a stale-snapshot bug where the
  // queue re-seeded from a pre-mutation dueWords if the user rated faster
  // than the refetch.
  const queue = useMemo(
    () => (dueWords ?? []).filter(w => !reviewedIds.has(w.id)),
    [dueWords, reviewedIds],
  );

  // Must be called unconditionally — hook order has to be stable across renders.
  const previews = useNextIntervals(queue[0]);

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
        <Text style={{ color: palette.text }}>Failed to load due words.</Text>
        <Text style={[styles.errorDetail, { color: palette.muted }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  const current = queue[0];

  if (!current) {
    return (
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={[styles.root, { backgroundColor: palette.background }]}
      >
        <TopBar palette={palette} onAdd={() => setAddOpen(true)} />
        {stats && <Dashboard stats={stats} palette={palette} />}
        <View style={styles.center}>
          <Text style={[styles.empty, { color: palette.text }]}>All caught up.</Text>
          <Text style={[styles.emptyHint, { color: palette.muted }]}>
            Capture words from the Read tab to build your deck.
          </Text>
        </View>
        <AddWordModal visible={addOpen} onClose={() => setAddOpen(false)} />
      </SafeAreaView>
    );
  }

  const handleRate = (rating: Rating) => {
    reviewMutation.mutate({ word: current, rating });
    setReviewedIds(prev => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });
    setRevealed(false);
  };

  const remaining = queue.length;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
      <TopBar palette={palette} onAdd={() => setAddOpen(true)} />

      {stats && <Dashboard stats={stats} palette={palette} />}

      <View style={styles.header}>
        <Text style={[styles.counter, { color: palette.muted }]}>
          {remaining} card{remaining === 1 ? '' : 's'} left
        </Text>
      </View>

      <Pressable
        onPress={() => setRevealed(r => !r)}
        style={[styles.card, { borderColor: palette.border }]}
      >
        <CardFace
          word={current}
          revealed={revealed}
          palette={palette}
        />
        {!revealed && (
          <Text style={[styles.hint, { color: palette.muted }]}>tap to reveal</Text>
        )}
      </Pressable>

      {revealed && (
        <View style={styles.ratings}>
          {RATINGS.map(r => (
            <Pressable
              key={r.value}
              onPress={() => handleRate(r.value)}
              style={[styles.ratingBtn, { borderColor: palette.border }]}
            >
              <Text style={[styles.ratingText, { color: palette.text }]}>{r.label}</Text>
              <Text style={[styles.ratingInterval, { color: palette.muted }]}>
                {previews[r.value]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <AddWordModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}

function TopBar({ palette, onAdd }: { palette: Palette; onAdd: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onAdd} hitSlop={12}>
        <Text style={[styles.topBarAdd, { color: palette.tint }]}>+ Add word</Text>
      </Pressable>
    </View>
  );
}

function Dashboard({ stats, palette }: { stats: StudyStats; palette: Palette }) {
  const now = new Date();
  return (
    <View style={[styles.dashboard, { borderColor: palette.border }]}>
      <View style={styles.dashboardRow}>
        <DashboardStat label="Done today" value={stats.doneToday} palette={palette} />
        <DashboardStat label="Due now" value={stats.dueNow} palette={palette} />
      </View>
      <View style={styles.forecastRow}>
        {stats.next7Days.map((count, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() + i + 1);
          const day = d.toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <View key={i} style={styles.forecastCell}>
              <Text style={[styles.forecastDay, { color: palette.muted }]}>{day}</Text>
              <Text
                style={[
                  styles.forecastCount,
                  { color: count > 0 ? palette.text : palette.muted },
                ]}
              >
                {count}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DashboardStat({
  label,
  value,
  palette,
}: {
  label: string;
  value: number;
  palette: Palette;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function useNextIntervals(word: UserWord | undefined): Record<Rating, string> {
  return useMemo(() => {
    if (!word) {
      return { again: '', hard: '', good: '', easy: '' };
    }
    const state: SrsState = {
      interval: word.srsInterval,
      ease: word.srsEase,
      repetitions: word.srsRepetitions,
      due: word.srsDue,
    };
    const now = new Date();
    return {
      again: formatInterval(nextState(state, 'again', now).interval),
      hard: formatInterval(nextState(state, 'hard', now).interval),
      good: formatInterval(nextState(state, 'good', now).interval),
      easy: formatInterval(nextState(state, 'easy', now).interval),
    };
  }, [word]);
}

function CardFace({
  word,
  revealed,
  palette,
}: {
  word: UserWord;
  revealed: boolean;
  palette: Palette;
}) {
  const spanishOnFront = word.direction === 'es_to_en';
  const frontText = spanishOnFront ? word.spanish : word.english;
  const backText = spanishOnFront ? word.english : word.spanish;
  const backIsSpanish = !spanishOnFront;

  if (!revealed) {
    return (
      <View style={styles.spanishRow}>
        <Text style={[styles.faceText, { color: palette.text }]}>{frontText}</Text>
        {spanishOnFront && (
          <Pressable
            onPress={e => {
              e.stopPropagation();
              speak(word.spanish);
            }}
            hitSlop={12}
          >
            <Text style={[styles.speakBtn, { color: palette.tint }]}>🔊</Text>
          </Pressable>
        )}
      </View>
    );
  }
  return (
    <View style={styles.backFace}>
      <View style={styles.spanishRow}>
        <Text style={[styles.faceText, { color: palette.text }]}>{backText}</Text>
        {backIsSpanish && (
          <Pressable
            onPress={e => {
              e.stopPropagation();
              speak(word.spanish);
            }}
            hitSlop={12}
          >
            <Text style={[styles.speakBtn, { color: palette.tint }]}>🔊</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.faceMeta, { color: palette.muted }]}>{word.partOfSpeech}</Text>
      {word.sourceSentence && (
        <Text style={[styles.context, { color: palette.muted }]}>
          “{word.sourceSentence}”
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorDetail: { fontSize: 12, marginTop: 4 },
  empty: { fontSize: 20, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  header: { alignItems: 'flex-end', marginBottom: 12 },
  counter: { fontSize: 13, fontWeight: '500' },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { position: 'absolute', bottom: 16, fontSize: 12 },
  faceText: { fontSize: 28, fontWeight: '600', textAlign: 'center' },
  faceMeta: { fontSize: 14, marginTop: 8 },
  backFace: { alignItems: 'center' },
  context: {
    fontSize: 15,
    marginTop: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  ratings: { flexDirection: 'row', gap: 8, marginTop: 16 },
  ratingBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ratingText: { fontSize: 14, fontWeight: '600' },
  ratingInterval: { fontSize: 11, marginTop: 4 },
  dashboard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dashboardRow: { flexDirection: 'row', gap: 16 },
  statCell: { flex: 1 },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '600', marginTop: 2 },
  forecastRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#80808040',
  },
  forecastCell: { flex: 1, alignItems: 'center' },
  forecastDay: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },
  forecastCount: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  topBarAdd: { fontSize: 15, fontWeight: '600' },
  spanishRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speakBtn: { fontSize: 22 },
});
