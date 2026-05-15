import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StudyDashboard } from '@/components/StudyDashboard';
import {
  useConjugationStats,
  useDueConjugationCards,
  useReleaseConjugationCards,
  useReviewConjugationCard,
  useSuspendConjugationCard,
} from '@/hooks/useConjugationCards';
import { renderCloze } from '@/services/cloze';
import { describeError } from '@/services/errors';
import { formatInterval, nextState, type Rating, type SrsState } from '@/services/srs';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { ConjugationCardState, ConjugationCardWithState } from '@/types';

const RATINGS: { label: string; value: Rating }[] = [
  { label: 'Again', value: 'again' },
  { label: 'Hard', value: 'hard' },
  { label: 'Good', value: 'good' },
  { label: 'Easy', value: 'easy' },
];

export function ConjugationStudy() {
  const theme = useTheme();
  const { data: dueCards, isLoading, error } = useDueConjugationCards();
  const { data: stats } = useConjugationStats();
  const reviewMutation = useReviewConjugationCard();
  const releaseMutation = useReleaseConjugationCards();
  const suspendMutation = useSuspendConjugationCard();

  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [releaseCount, setReleaseCount] = useState('10');

  const queue = useMemo(
    () => (dueCards ?? []).filter(c => !reviewedIds.has(c.state.id)),
    [dueCards, reviewedIds],
  );

  const previews = useNextIntervals(queue[0]?.state);

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
          Failed to load conjugation cards.
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 4 }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  const current = queue[0];
  const total = stats?.total ?? 0;
  const released = stats?.released ?? 0;
  const remaining = Math.max(0, total - released);

  const handleApplyRelease = () => {
    const n = Math.max(0, Math.floor(Number(releaseCount) || 0));
    if (n === 0) return;
    releaseMutation.mutate(n, {
      onSuccess: () => setReleaseCount('10'),
    });
  };

  const releaseControl = (
    <View
      style={[
        styles.releaseRow,
        {
          borderBottomColor: theme.color.border,
          paddingBottom: theme.space.sm,
          marginBottom: theme.space.sm,
        },
      ]}
    >
      <View>
        <Text style={[theme.text.caption, { color: theme.color.textMuted }]}>
          Released
        </Text>
        <Text style={[theme.text.subtitle, { color: theme.color.text, marginTop: 2 }]}>
          {released} / {total}
        </Text>
      </View>
      {remaining > 0 && (
        <View style={styles.releaseRight}>
          <TextInput
            value={releaseCount}
            onChangeText={setReleaseCount}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor={theme.color.textDim}
            style={[
              styles.releaseInput,
              {
                color: theme.color.text,
                borderColor: theme.color.border,
                backgroundColor: theme.color.bg,
                fontFamily: theme.fontFamily.sansMedium,
              },
            ]}
          />
          <Pressable
            onPress={handleApplyRelease}
            disabled={releaseMutation.isPending}
            style={[
              styles.releaseBtn,
              {
                backgroundColor: theme.color.accent,
                borderRadius: theme.radius.md,
                opacity: releaseMutation.isPending ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[theme.text.bodyEm, { color: '#FFFFFF' }]}>
              {releaseMutation.isPending ? '…' : 'Release'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      {stats && <StudyDashboard stats={stats} extra={releaseControl} />}
      {releaseMutation.error && (
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginBottom: theme.space.sm }]}>
          {describeError(releaseMutation.error)}
        </Text>
      )}

      {!current ? (
        <View style={styles.center}>
          <Text style={[theme.text.heading, { color: theme.color.text, textAlign: 'center' }]}>
            {released === 0
              ? 'Nothing released yet.'
              : 'All caught up for the released set.'}
          </Text>
          <Text
            style={[
              theme.text.tiny,
              { color: theme.color.textMuted, marginTop: 8, textAlign: 'center' },
            ]}
          >
            {released === 0
              ? 'Release a batch above to start studying.'
              : remaining > 0
                ? 'Release more cards above to extend the deck.'
                : "You've released the entire deck."}
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
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <CardFace card={current} revealed={revealed} theme={theme} />
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
                    reviewMutation.mutate({ state: current.state, rating: r.value });
                    setReviewedIds(prev => {
                      const next = new Set(prev);
                      next.add(current.state.id);
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
              {isFirstShow(current.state) && (
                <Pressable
                  onPress={() => {
                    suspendMutation.mutate(current.state);
                    setReviewedIds(prev => {
                      const next = new Set(prev);
                      next.add(current.state.id);
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
                  <Text style={[theme.text.tiny, { color: theme.color.textDim, marginTop: 2 }]}>
                    first-time
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function isFirstShow(state: ConjugationCardState): boolean {
  return state.srsRepetitions === 0 && state.lastReviewedAt === null;
}

function useNextIntervals(state: ConjugationCardState | undefined): Record<Rating, string> {
  return useMemo(() => {
    if (!state) {
      return { again: '', hard: '', good: '', easy: '' };
    }
    const s: SrsState = {
      interval: state.srsInterval,
      ease: state.srsEase,
      repetitions: state.srsRepetitions,
      due: state.srsDue,
    };
    const now = new Date();
    return {
      again: formatInterval(nextState(s, 'again', now).interval),
      hard: formatInterval(nextState(s, 'hard', now).interval),
      good: formatInterval(nextState(s, 'good', now).interval),
      easy: formatInterval(nextState(s, 'easy', now).interval),
    };
  }, [state]);
}

function CardFace({
  card,
  revealed,
  theme,
}: {
  card: ConjugationCardWithState;
  revealed: boolean;
  theme: Theme;
}) {
  const { front, back } = useMemo(() => renderCloze(card.card.prompt), [card.card.prompt]);

  if (!revealed) {
    return (
      <Text
        style={[
          theme.text.heading,
          { color: theme.color.text, textAlign: 'center', lineHeight: 28 },
        ]}
      >
        {front}
      </Text>
    );
  }
  return (
    <View style={styles.backFace}>
      <Text
        style={[
          theme.text.heading,
          { color: theme.color.text, textAlign: 'center', lineHeight: 28 },
        ]}
      >
        {back}
      </Text>
      {card.card.verb && (
        <Text
          style={[
            theme.text.tiny,
            {
              color: theme.color.accent,
              marginTop: theme.space.md,
              fontStyle: 'italic',
            },
          ]}
        >
          {card.card.verb}
        </Text>
      )}
      {card.card.notes && (
        <Text
          style={[
            theme.text.tiny,
            {
              color: theme.color.textMuted,
              marginTop: theme.space.lg,
              textAlign: 'center',
              paddingHorizontal: theme.space.sm,
              lineHeight: 18,
            },
          ]}
        >
          {card.card.notes}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  releaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  releaseRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  releaseInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  releaseBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  card: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { position: 'absolute', bottom: 14 },
  backFace: { alignItems: 'center' },
  ratings: { flexDirection: 'row', gap: 6, marginTop: 12 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
