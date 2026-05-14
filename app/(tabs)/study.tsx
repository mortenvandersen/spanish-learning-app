import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useDueUserWords, useReviewUserWord } from '@/hooks/useUserWords';
import { speak } from '@/services/speech';
import type { Rating } from '@/services/srs';
import type { UserWord } from '@/types';

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
  const reviewMutation = useReviewUserWord();

  const [queue, setQueue] = useState<UserWord[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (dueWords && queue.length === 0) {
      setQueue(dueWords);
    }
  }, [dueWords, queue.length]);

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
          {error instanceof Error ? error.message : String(error)}
        </Text>
      </View>
    );
  }

  const current = queue[0];

  if (!current) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={[styles.empty, { color: palette.text }]}>All caught up.</Text>
        <Text style={[styles.emptyHint, { color: palette.muted }]}>
          Capture words from the Read tab to build your deck.
        </Text>
      </View>
    );
  }

  const handleRate = (rating: Rating) => {
    reviewMutation.mutate({ word: current, rating });
    setQueue(q => q.slice(1));
    setRevealed(false);
  };

  const remaining = queue.length;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
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
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
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
  if (!revealed) {
    return <Text style={[styles.faceText, { color: palette.text }]}>{word.english}</Text>;
  }
  return (
    <View style={styles.backFace}>
      <View style={styles.spanishRow}>
        <Text style={[styles.faceText, { color: palette.text }]}>{word.spanish}</Text>
        <Pressable
          onPress={e => {
            e.stopPropagation();
            speak(word.spanish);
          }}
          hitSlop={12}
        >
          <Text style={[styles.speakBtn, { color: palette.tint }]}>🔊</Text>
        </Pressable>
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
  spanishRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speakBtn: { fontSize: 22 },
});
