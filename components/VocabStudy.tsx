import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AddWordModal } from '@/components/AddWordModal';
import { StudyDashboard } from '@/components/StudyDashboard';
import { Colors } from '@/constants/Colors';
import {
  useDueUserWords,
  useReviewUserWord,
  useStudyStats,
} from '@/hooks/useUserWords';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { formatInterval, nextState, type Rating, type SrsState } from '@/services/srs';
import type { UserWord } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

const RATINGS: { label: string; value: Rating }[] = [
  { label: 'Again', value: 'again' },
  { label: 'Hard', value: 'hard' },
  { label: 'Good', value: 'good' },
  { label: 'Easy', value: 'easy' },
];

export function VocabStudy({ palette }: { palette: Palette }) {
  const { data: dueWords, isLoading, error } = useDueUserWords();
  const { data: stats } = useStudyStats();
  const reviewMutation = useReviewUserWord();

  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const queue = useMemo(
    () => (dueWords ?? []).filter(w => !reviewedIds.has(w.id)),
    [dueWords, reviewedIds],
  );

  const previews = useNextIntervals(queue[0]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: palette.text }}>Failed to load due words.</Text>
        <Text style={[styles.errorDetail, { color: palette.muted }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  const current = queue[0];

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => setAddOpen(true)} hitSlop={12}>
          <Text style={[styles.topBarAdd, { color: palette.tint }]}>+ Add word</Text>
        </Pressable>
      </View>

      {stats && <StudyDashboard stats={stats} palette={palette} />}

      {!current ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: palette.text }]}>All caught up.</Text>
          <Text style={[styles.emptyHint, { color: palette.muted }]}>
            Capture words from the Read tab to build your deck.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.counter, { color: palette.muted }]}>
              {queue.length} card{queue.length === 1 ? '' : 's'} left
            </Text>
          </View>

          <Pressable
            onPress={() => setRevealed(r => !r)}
            style={[styles.card, { borderColor: palette.border }]}
          >
            <CardFace word={current} revealed={revealed} palette={palette} />
            {!revealed && (
              <Text style={[styles.hint, { color: palette.muted }]}>tap to reveal</Text>
            )}
          </Pressable>

          {revealed && (
            <View style={styles.ratings}>
              {RATINGS.map(r => (
                <Pressable
                  key={r.value}
                  onPress={() => {
                    reviewMutation.mutate({ word: current, rating: r.value });
                    setReviewedIds(prev => {
                      const next = new Set(prev);
                      next.add(current.id);
                      return next;
                    });
                    setRevealed(false);
                  }}
                  style={[styles.ratingBtn, { borderColor: palette.border }]}
                >
                  <Text style={[styles.ratingText, { color: palette.text }]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.ratingInterval, { color: palette.muted }]}>
                    {previews[r.value]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      <AddWordModal visible={addOpen} onClose={() => setAddOpen(false)} />
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
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorDetail: { fontSize: 12, marginTop: 4 },
  empty: { fontSize: 20, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  topBarAdd: { fontSize: 15, fontWeight: '600' },
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
  spanishRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speakBtn: { fontSize: 22 },
});
