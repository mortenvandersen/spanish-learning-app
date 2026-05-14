import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePassage } from '@/hooks/usePassages';
import { useCaptureWord, useUserWords } from '@/hooks/useUserWords';
import { lookup } from '@/services/dictionary';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { findSentenceAt, tokenize } from '@/services/tokenize';
import type { LookupResult, Passage } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

interface PopoverState {
  surface: string;
  sentence: string;
  loading: boolean;
  result: LookupResult | null;
  error: string | null;
}

function capturedKey(spanish: string, partOfSpeech: string): string {
  return `${spanish}|${partOfSpeech}`;
}

function englishFromLemma(result: LookupResult): string {
  return result.lemma.senses
    .slice(0, 5)
    .map(s => s.definition)
    .join('; ');
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { data: passage, isLoading, error } = usePassage(id);
  const { data: userWords } = useUserWords();
  const captureMutation = useCaptureWord();
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const capturedKeys = useMemo(
    () => new Set((userWords ?? []).map(w => capturedKey(w.spanish, w.partOfSpeech))),
    [userWords],
  );

  const handleWordPress = useCallback(async (surface: string, sentence: string) => {
    setPopover({ surface, sentence, loading: true, result: null, error: null });
    try {
      const result = await lookup(surface);
      setPopover({ surface, sentence, loading: false, result, error: null });
    } catch (e) {
      setPopover({
        surface,
        sentence,
        loading: false,
        result: null,
        error: describeError(e),
      });
    }
  }, []);

  const handleAddToDeck = useCallback(() => {
    if (!popover?.result || !passage) return;
    const { lemma } = popover.result;
    captureMutation.mutate({
      spanish: lemma.lemma,
      english: englishFromLemma(popover.result),
      partOfSpeech: lemma.partOfSpeech,
      sourcePassageId: passage.id,
      sourceSentence: popover.sentence || null,
    });
  }, [popover, passage, captureMutation]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !passage) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.text }}>Failed to load passage.</Text>
        {error && (
          <Text style={[styles.errorDetail, { color: palette.muted }]}>
            {describeError(error)}
          </Text>
        )}
      </View>
    );
  }

  const tokens = tokenize(passage.body);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: palette.text }]}>{passage.title}</Text>
        <Text style={[styles.body, { color: palette.text }]}>
          {tokens.map((tok, i) => {
            if (tok.kind === 'delim') return <Text key={i}>{tok.text}</Text>;
            return (
              <Text
                key={i}
                onPress={() => {
                  const offset = tokens
                    .slice(0, i)
                    .reduce((sum, t) => sum + t.text.length, 0);
                  const sentence = findSentenceAt(passage.body, offset);
                  handleWordPress(tok.text, sentence);
                }}
                style={styles.word}
              >
                {tok.text}
              </Text>
            );
          })}
        </Text>
      </ScrollView>

      <Modal
        visible={!!popover}
        transparent
        animationType="slide"
        onRequestClose={() => setPopover(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPopover(null)}>
          <Pressable
            style={[
              styles.popover,
              { backgroundColor: palette.background, borderTopColor: palette.border },
            ]}
            onPress={() => {
              /* absorb tap so the backdrop doesn't dismiss */
            }}
          >
            {popover && (
              <PopoverContent
                state={popover}
                palette={palette}
                passage={passage}
                capturedKeys={capturedKeys}
                onAddToDeck={handleAddToDeck}
                captureLoading={captureMutation.isPending}
                captureError={
                  captureMutation.error ? describeError(captureMutation.error) : null
                }
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

interface PopoverContentProps {
  state: PopoverState;
  palette: Palette;
  passage: Passage;
  capturedKeys: Set<string>;
  onAddToDeck: () => void;
  captureLoading: boolean;
  captureError: string | null;
}

function PopoverContent({
  state,
  palette,
  capturedKeys,
  onAddToDeck,
  captureLoading,
  captureError,
}: PopoverContentProps) {
  if (state.loading) {
    return (
      <View style={styles.popoverLoading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (state.error) {
    return (
      <View>
        <Text style={[styles.popoverTitle, { color: palette.text }]}>{state.surface}</Text>
        <Text style={[styles.errorDetail, { color: palette.muted }]}>{state.error}</Text>
      </View>
    );
  }

  if (!state.result) {
    return (
      <View>
        <Text style={[styles.popoverTitle, { color: palette.text }]}>{state.surface}</Text>
        <Text style={[styles.popoverMeta, { color: palette.muted }]}>
          No translation found.
        </Text>
      </View>
    );
  }

  const { lemma, grammarFeatures, clitics } = state.result;
  const isCaptured = capturedKeys.has(capturedKey(lemma.lemma, lemma.partOfSpeech));
  const metaParts: string[] = [lemma.partOfSpeech];
  if (lemma.gender) metaParts.push(`(${lemma.gender})`);
  if (grammarFeatures && grammarFeatures !== 'unknown') metaParts.push(`— ${grammarFeatures}`);

  return (
    <ScrollView style={{ flexGrow: 0 }}>
      <View style={styles.titleRow}>
        <Text style={[styles.popoverTitle, { color: palette.text }]}>{lemma.lemma}</Text>
        <Pressable onPress={() => speak(lemma.lemma)} hitSlop={10}>
          <Text style={[styles.speakBtn, { color: palette.tint }]}>🔊</Text>
        </Pressable>
      </View>
      <Text style={[styles.popoverMeta, { color: palette.muted }]}>{metaParts.join(' ')}</Text>
      {clitics && clitics.length > 0 && (
        <Text style={[styles.popoverClitics, { color: palette.muted }]}>
          + {clitics.join(' + ')}
        </Text>
      )}
      {lemma.senses.slice(0, 5).map((sense, i) => (
        <View key={i} style={styles.sense}>
          <Text style={{ color: palette.text }}>
            {i + 1}. {sense.definition}
          </Text>
          {sense.exampleEs && (
            <Text style={[styles.example, { color: palette.muted }]}>
              {sense.exampleEs}
              {sense.exampleEn ? ` — ${sense.exampleEn}` : ''}
            </Text>
          )}
        </View>
      ))}

      <View style={styles.deckRow}>
        {isCaptured ? (
          <Text style={[styles.inDeck, { color: palette.muted }]}>✓ in deck</Text>
        ) : (
          <Pressable
            onPress={onAddToDeck}
            disabled={captureLoading}
            style={[styles.addBtn, { borderColor: palette.tint }]}
          >
            <Text style={{ color: palette.tint, fontWeight: '600' }}>
              {captureLoading ? 'Adding…' : 'Add to deck'}
            </Text>
          </Pressable>
        )}
        {captureError && (
          <Text style={[styles.errorDetail, { color: palette.muted }]}>{captureError}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorDetail: { fontSize: 12, marginTop: 4 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  body: { fontSize: 18, lineHeight: 28 },
  word: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  popover: {
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '60%',
  },
  popoverLoading: { paddingVertical: 16 },
  popoverTitle: { fontSize: 24, fontWeight: '600' },
  popoverMeta: { fontSize: 13, marginTop: 4 },
  popoverClitics: { fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  sense: { marginTop: 12 },
  example: { fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  deckRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  inDeck: { fontSize: 14, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speakBtn: { fontSize: 20 },
});
