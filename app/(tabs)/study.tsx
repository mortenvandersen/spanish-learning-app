import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConjugationStudy } from '@/components/ConjugationStudy';
import { VocabStudy } from '@/components/VocabStudy';
import { useConjugationStats } from '@/hooks/useConjugationCards';
import { useStudyStats } from '@/hooks/useUserWords';
import { useTheme, type Theme } from '@/theme/useTheme';

type Deck = 'vocab' | 'conjugation';

const DECKS: { label: string; value: Deck }[] = [
  { label: 'Vocab', value: 'vocab' },
  { label: 'Conjugation', value: 'conjugation' },
];

export default function StudyScreen() {
  const theme = useTheme();
  const [deck, setDeck] = useState<Deck>('vocab');

  const { data: vocabStats } = useStudyStats();
  const { data: conjStats } = useConjugationStats();
  const totalToday = (vocabStats?.doneToday ?? 0) + (conjStats?.doneToday ?? 0);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: theme.color.bg }]}
    >
      <Text
        style={[
          theme.text.tiny,
          { color: theme.color.textMuted, textAlign: 'center', marginBottom: 8 },
        ]}
      >
        Today: {totalToday} reviewed across all decks
      </Text>

      <DeckSwitcher value={deck} onChange={setDeck} theme={theme} />

      {deck === 'vocab' ? <VocabStudy /> : <ConjugationStudy />}
    </SafeAreaView>
  );
}

function DeckSwitcher({
  value,
  onChange,
  theme,
}: {
  value: Deck;
  onChange: (d: Deck) => void;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.switcher,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.md,
          padding: 3,
        },
      ]}
    >
      {DECKS.map(d => {
        const selected = d.value === value;
        return (
          <Pressable
            key={d.value}
            onPress={() => onChange(d.value)}
            style={[
              styles.switcherBtn,
              {
                backgroundColor: selected ? theme.color.accent : 'transparent',
                borderRadius: theme.radius.sm,
              },
            ]}
          >
            <Text
              style={[
                theme.text.bodyEm,
                {
                  color: selected ? '#FFFFFF' : theme.color.text,
                  fontSize: 13,
                },
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
  switcher: { flexDirection: 'row', marginBottom: 12 },
  switcherBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
