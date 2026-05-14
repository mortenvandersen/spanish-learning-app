import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useUserWords } from '@/hooks/useUserWords';
import { describeError } from '@/services/errors';
import type { UserWord } from '@/types';

const PAIRS_PER_ROUND = 8;
const GRID_COLUMNS = 4;
const GRID_PADDING = 16;
const GRID_GAP = 8;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);

interface GameCard {
  index: number;
  wordId: string;
  side: 'es' | 'en';
  text: string;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickGameCards(deck: UserWord[]): GameCard[] {
  if (deck.length < PAIRS_PER_ROUND) return [];
  const sample = shuffle(deck).slice(0, PAIRS_PER_ROUND);
  const halves = sample.flatMap<Omit<GameCard, 'index'>>(w => [
    { wordId: w.id, side: 'es', text: w.spanish },
    { wordId: w.id, side: 'en', text: w.english },
  ]);
  return shuffle(halves).map((c, i) => ({ ...c, index: i }));
}

export default function PlayScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { data: deck, isLoading, error } = useUserWords();

  const [roundSeed, setRoundSeed] = useState(0);
  const cards = useMemo(
    () => (deck ? pickGameCards(deck) : []),
    // roundSeed is the trigger to reshuffle; deck reference also reshuffles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck, roundSeed],
  );

  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selection, setSelection] = useState<number[]>([]);

  // Reset when a new round starts.
  useEffect(() => {
    setFlipped(new Set());
    setMatched(new Set());
    setSelection([]);
  }, [cards]);

  // Evaluate selection of two cards.
  useEffect(() => {
    if (selection.length !== 2) return;
    const [a, b] = selection;
    if (cards[a].wordId === cards[b].wordId) {
      setMatched(prev => new Set([...prev, a, b]));
      setSelection([]);
      return;
    }
    const t = setTimeout(() => {
      setFlipped(prev => {
        const next = new Set(prev);
        next.delete(a);
        next.delete(b);
        return next;
      });
      setSelection([]);
    }, 900);
    return () => clearTimeout(t);
  }, [selection, cards]);

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
        <Text style={{ color: palette.text }}>Failed to load deck.</Text>
        <Text style={[styles.errorDetail, { color: palette.muted }]}>
          {describeError(error)}
        </Text>
      </View>
    );
  }

  const deckSize = deck?.length ?? 0;
  if (deckSize < PAIRS_PER_ROUND) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={[styles.empty, { color: palette.text }]}>
          Need at least {PAIRS_PER_ROUND} captured words to play.
        </Text>
        <Text style={[styles.emptyHint, { color: palette.muted }]}>
          You have {deckSize}. Capture more in the Read tab.
        </Text>
      </View>
    );
  }

  const handleTap = (idx: number) => {
    if (matched.has(idx) || flipped.has(idx)) return;
    if (selection.length >= 2) return;
    setFlipped(prev => new Set([...prev, idx]));
    setSelection(prev => [...prev, idx]);
  };

  const allMatched = matched.size === cards.length && cards.length > 0;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
      <View style={styles.grid}>
        {cards.map(card => {
          const isFaceUp = flipped.has(card.index) || matched.has(card.index);
          const isMatched = matched.has(card.index);
          return (
            <Pressable
              key={card.index}
              onPress={() => handleTap(card.index)}
              style={[
                styles.card,
                {
                  borderColor: palette.border,
                  backgroundColor: isMatched ? palette.captured : palette.background,
                  opacity: isMatched ? 0.6 : 1,
                },
              ]}
            >
              {isFaceUp ? (
                <Text
                  style={[styles.cardText, { color: palette.text }]}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                >
                  {card.text}
                </Text>
              ) : (
                <Text style={[styles.cardBack, { color: palette.muted }]}>?</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {allMatched && (
        <Pressable
          onPress={() => setRoundSeed(s => s + 1)}
          style={[styles.newRound, { borderColor: palette.tint }]}
        >
          <Text style={[styles.newRoundText, { color: palette.tint }]}>New round</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: GRID_PADDING },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorDetail: { fontSize: 12, marginTop: 4 },
  empty: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cardText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  cardBack: { fontSize: 28, fontWeight: '300' },
  newRound: {
    alignSelf: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  newRoundText: { fontSize: 16, fontWeight: '600' },
});
