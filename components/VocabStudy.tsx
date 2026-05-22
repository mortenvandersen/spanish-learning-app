import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AddWordModal } from '@/components/AddWordModal';
import { StudyDashboard } from '@/components/StudyDashboard';
import {
  useDueUserWords,
  useReviewUserWord,
  useStudyStats,
  useSuspendUserWord,
} from '@/hooks/useUserWords';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { formatInterval, nextState, type Rating, type SrsState } from '@/services/srs';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { UserWord } from '@/types';

const RATINGS: { label: string; value: Rating }[] = [
  { label: 'Again', value: 'again' },
  { label: 'Hard', value: 'hard' },
  { label: 'Good', value: 'good' },
  { label: 'Easy', value: 'easy' },
];

export function VocabStudy() {
  const theme = useTheme();
  const { data: dueWords, isLoading, error } = useDueUserWords();
  const { data: stats } = useStudyStats();
  const reviewMutation = useReviewUserWord();
  const suspendMutation = useSuspendUserWord();

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
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Failed to load due words.
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 4 }]}>
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
          <Text
            style={[
              theme.text.bodyEm,
              { color: theme.color.accent },
            ]}
          >
            + Add word
          </Text>
        </Pressable>
      </View>

      {stats && <StudyDashboard stats={stats} />}

      {!current ? (
        <View style={styles.center}>
          <Text style={[theme.text.heading, { color: theme.color.text }]}>
            All caught up.
          </Text>
          <Text
            style={[
              theme.text.tiny,
              { color: theme.color.textMuted, marginTop: 8, textAlign: 'center' },
            ]}
          >
            Capture words from the Read tab to build your deck.
          </Text>
        </View>
      ) : (
        <>
          <Text
            style={[
              theme.text.tiny,
              {
                color: theme.color.textMuted,
                alignSelf: 'flex-end',
                marginBottom: theme.space.sm,
              },
            ]}
          >
            {queue.length} card{queue.length === 1 ? '' : 's'} left
          </Text>

          <Pressable
            onPress={() => setRevealed(r => !r)}
            style={[
              styles.card,
              {
                backgroundColor: theme.color.surfaceElevated,
                borderRadius: theme.radius.lg,
                borderColor: theme.color.border,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.cardContent}
              showsVerticalScrollIndicator={false}
            >
              <CardFace word={current} revealed={revealed} theme={theme} />
            </ScrollView>
            {!revealed && (
              <Text
                style={[
                  theme.text.tiny,
                  styles.hint,
                  { color: theme.color.textDim },
                ]}
              >
                tap to reveal
              </Text>
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
                  style={[
                    styles.ratingBtn,
                    {
                      backgroundColor: theme.color.surface,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Text style={[theme.text.bodyEm, { color: theme.color.text }]}>
                    {r.label}
                  </Text>
                  <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 2 }]}>
                    {previews[r.value]}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  suspendMutation.mutate(current);
                  setReviewedIds(prev => {
                    const next = new Set(prev);
                    next.add(current.id);
                    return next;
                  });
                  setRevealed(false);
                }}
                style={[
                  styles.ratingBtn,
                  {
                    backgroundColor: theme.color.surface,
                    borderRadius: theme.radius.md,
                    opacity: 0.6,
                  },
                ]}
              >
                <Text style={[theme.text.bodyEm, { color: theme.color.textMuted }]}>
                  Remove
                </Text>
              </Pressable>
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
  theme,
}: {
  word: UserWord;
  revealed: boolean;
  theme: Theme;
}) {
  const spanishOnFront = word.direction === 'es_to_en';
  const frontText = spanishOnFront ? word.spanish : word.english;
  const backText = spanishOnFront ? word.english : word.spanish;
  const backIsSpanish = !spanishOnFront;

  if (!revealed) {
    return (
      <View style={styles.spanishRow}>
        <Text
          style={[theme.text.display, { color: theme.color.text, textAlign: 'center', flexShrink: 1 }]}
          adjustsFontSizeToFit
          numberOfLines={10}
          minimumFontScale={0.85}
        >
          {frontText}
        </Text>
        {spanishOnFront && (
          <Pressable
            onPress={e => {
              e.stopPropagation();
              speak(word.spanish);
            }}
            hitSlop={12}
          >
            <Text style={{ fontSize: 22, color: theme.color.accent }}>🔊</Text>
          </Pressable>
        )}
      </View>
    );
  }
  return (
    <View style={styles.backFace}>
      <View style={styles.spanishRow}>
        <Text
          style={[theme.text.display, { color: theme.color.text, textAlign: 'center', flexShrink: 1 }]}
          adjustsFontSizeToFit
          numberOfLines={10}
          minimumFontScale={0.85}
        >
          {backText}
        </Text>
        {backIsSpanish && (
          <Pressable
            onPress={e => {
              e.stopPropagation();
              speak(word.spanish);
            }}
            hitSlop={12}
          >
            <Text style={{ fontSize: 22, color: theme.color.accent }}>🔊</Text>
          </Pressable>
        )}
      </View>
      <Text
        style={[
          theme.text.tiny,
          { color: theme.color.textMuted, marginTop: theme.space.sm },
        ]}
      >
        {word.partOfSpeech}
      </Text>
      {word.sourceSentence && (
        <Text
          numberOfLines={10}
          style={[
            theme.text.body,
            {
              color: theme.color.textMuted,
              marginTop: theme.space.lg,
              textAlign: 'center',
              fontStyle: 'italic',
              paddingHorizontal: theme.space.lg,
            },
          ]}
        >
          “{word.sourceSentence}”
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { position: 'absolute', bottom: 14 },
  spanishRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backFace: { alignItems: 'center' },
  ratings: { flexDirection: 'row', gap: 6, marginTop: 12 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
