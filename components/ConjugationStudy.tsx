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
import { Colors } from '@/constants/Colors';
import {
  useConjugationStats,
  useDueConjugationCards,
  useReleaseConjugationCards,
  useReviewConjugationCard,
} from '@/hooks/useConjugationCards';
import { renderCloze } from '@/services/cloze';
import { describeError } from '@/services/errors';
import { formatInterval, nextState, type Rating, type SrsState } from '@/services/srs';
import type { ConjugationCardState, ConjugationCardWithState } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

const RATINGS: { label: string; value: Rating }[] = [
  { label: 'Again', value: 'again' },
  { label: 'Hard', value: 'hard' },
  { label: 'Good', value: 'good' },
  { label: 'Easy', value: 'easy' },
];

export function ConjugationStudy({ palette }: { palette: Palette }) {
  const { data: dueCards, isLoading, error } = useDueConjugationCards();
  const { data: stats } = useConjugationStats();
  const reviewMutation = useReviewConjugationCard();
  const releaseMutation = useReleaseConjugationCards();

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
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: palette.text }}>Failed to load conjugation cards.</Text>
        <Text style={[styles.errorDetail, { color: palette.muted }]}>
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
    <View style={styles.releaseRow}>
      <View style={styles.releaseLeft}>
        <Text style={[styles.releaseLabel, { color: palette.muted }]}>Released</Text>
        <Text style={[styles.releaseProgress, { color: palette.text }]}>
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
            placeholderTextColor={palette.muted}
            style={[
              styles.releaseInput,
              { color: palette.text, borderColor: palette.border },
            ]}
          />
          <Pressable
            onPress={handleApplyRelease}
            disabled={releaseMutation.isPending}
            style={[styles.releaseBtn, { borderColor: palette.tint }]}
          >
            <Text style={{ color: palette.tint, fontWeight: '600' }}>
              {releaseMutation.isPending ? '…' : 'Release'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      {stats && (
        <StudyDashboard stats={stats} palette={palette} extra={releaseControl} />
      )}
      {releaseMutation.error && (
        <Text style={[styles.errorDetail, { color: palette.muted }]}>
          {describeError(releaseMutation.error)}
        </Text>
      )}

      {!current ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: palette.text }]}>
            {released === 0
              ? 'Nothing released yet.'
              : 'All caught up for the released set.'}
          </Text>
          <Text style={[styles.emptyHint, { color: palette.muted }]}>
            {released === 0
              ? 'Release a batch above to start studying.'
              : remaining > 0
                ? 'Release more cards above to extend the deck.'
                : 'You\'ve released the entire deck.'}
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
            <CardFace card={current} revealed={revealed} palette={palette} />
            {!revealed && (
              <Text style={[styles.hint, { color: palette.muted }]}>
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
    </View>
  );
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
  palette,
}: {
  card: ConjugationCardWithState;
  revealed: boolean;
  palette: Palette;
}) {
  const { front, back } = useMemo(() => renderCloze(card.card.prompt), [card.card.prompt]);

  if (!revealed) {
    return <Text style={[styles.prompt, { color: palette.text }]}>{front}</Text>;
  }
  return (
    <View style={styles.backFace}>
      <Text style={[styles.prompt, { color: palette.text }]}>{back}</Text>
      {card.card.verb && (
        <Text style={[styles.verb, { color: palette.muted }]}>{card.card.verb}</Text>
      )}
      {card.card.notes && (
        <Text style={[styles.notes, { color: palette.muted }]}>{card.card.notes}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorDetail: { fontSize: 12, marginTop: 4, marginBottom: 8 },
  empty: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  releaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#80808040',
  },
  releaseLeft: { flexDirection: 'column' },
  releaseLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  releaseProgress: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  releaseRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  releaseInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 64,
    textAlign: 'center',
    fontSize: 14,
  },
  releaseBtn: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
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
  prompt: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 28,
  },
  backFace: { alignItems: 'center' },
  verb: { fontSize: 13, marginTop: 12, fontStyle: 'italic' },
  notes: {
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 18,
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
});
