import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConjugationStudy } from '@/components/ConjugationStudy';
import { VocabStudy } from '@/components/VocabStudy';
import { Colors } from '@/constants/Colors';
import { useConjugationStats } from '@/hooks/useConjugationCards';
import { useStudyStats } from '@/hooks/useUserWords';

type Palette = (typeof Colors)['light' | 'dark'];
type Deck = 'vocab' | 'conjugation';

const DECKS: { label: string; value: Deck }[] = [
  { label: 'Vocab', value: 'vocab' },
  { label: 'Conjugation', value: 'conjugation' },
];

export default function StudyScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [deck, setDeck] = useState<Deck>('vocab');

  const { data: vocabStats } = useStudyStats();
  const { data: conjStats } = useConjugationStats();
  const totalToday = (vocabStats?.doneToday ?? 0) + (conjStats?.doneToday ?? 0);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.totalLine, { color: palette.muted }]}>
        Today: {totalToday} reviewed across all decks
      </Text>

      <DeckSwitcher value={deck} onChange={setDeck} palette={palette} />

      {deck === 'vocab' ? (
        <VocabStudy palette={palette} />
      ) : (
        <ConjugationStudy palette={palette} />
      )}
    </SafeAreaView>
  );
}

function DeckSwitcher({
  value,
  onChange,
  palette,
}: {
  value: Deck;
  onChange: (d: Deck) => void;
  palette: Palette;
}) {
  return (
    <View style={styles.switcher}>
      {DECKS.map(d => {
        const selected = d.value === value;
        return (
          <Pressable
            key={d.value}
            onPress={() => onChange(d.value)}
            style={[
              styles.switcherBtn,
              {
                borderColor: palette.border,
                backgroundColor: selected ? palette.tint : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.switcherText,
                { color: selected ? palette.background : palette.text },
              ]}
            >
              {d.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  totalLine: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  switcher: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  switcherBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switcherText: { fontSize: 14, fontWeight: '600' },
});
