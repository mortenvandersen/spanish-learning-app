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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePassage } from '@/hooks/usePassages';
import { useCaptureWord, useUserWords } from '@/hooks/useUserWords';
import { lookup } from '@/services/dictionary';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { findSentenceAt, tokenize } from '@/services/tokenize';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { LookupResult, Passage } from '@/types';

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
  const theme = useTheme();
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
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (error || !passage) {
    return (
      <View style={[styles.center, { backgroundColor: theme.color.bg }]}>
        <Text style={[theme.text.body, { color: theme.color.text }]}>
          Failed to load passage.
        </Text>
        {error && (
          <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
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
      style={[styles.root, { backgroundColor: theme.color.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[theme.text.heading, { color: theme.color.text, marginBottom: theme.space.lg }]}>
          {passage.title}
        </Text>
        <Text style={[theme.text.reader, { color: theme.color.text }]}>
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
                style={[styles.word, { textDecorationColor: theme.color.textDim }]}
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
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.color.backdrop }]}
          onPress={() => setPopover(null)}
        >
          <Pressable
            style={[
              styles.popover,
              {
                backgroundColor: theme.color.surfaceElevated,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
              },
            ]}
            onPress={() => {
              /* absorb tap so the backdrop doesn't dismiss */
            }}
          >
            {popover && (
              <PopoverContent
                state={popover}
                theme={theme}
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
  theme: Theme;
  passage: Passage;
  capturedKeys: Set<string>;
  onAddToDeck: () => void;
  captureLoading: boolean;
  captureError: string | null;
}

function PopoverContent({
  state,
  theme,
  capturedKeys,
  onAddToDeck,
  captureLoading,
  captureError,
}: PopoverContentProps) {
  if (state.loading) {
    return (
      <View style={styles.popoverLoading}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (state.error) {
    return (
      <View>
        <Text style={[theme.text.heading, { color: theme.color.text }]}>
          {state.surface}
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
          {state.error}
        </Text>
      </View>
    );
  }

  if (!state.result) {
    return (
      <View>
        <Text style={[theme.text.heading, { color: theme.color.text }]}>
          {state.surface}
        </Text>
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
          No translation found.
        </Text>
      </View>
    );
  }

  const { lemma, grammarFeatures, clitics } = state.result;
  const isCaptured = capturedKeys.has(capturedKey(lemma.lemma, lemma.partOfSpeech));
  const metaParts: string[] = [lemma.partOfSpeech];
  if (lemma.gender) metaParts.push(`(${lemma.gender})`);
  if (grammarFeatures && grammarFeatures !== 'unknown') metaParts.push(`· ${grammarFeatures}`);

  return (
    <ScrollView style={{ flexGrow: 0 }}>
      <View style={styles.titleRow}>
        <Text style={[theme.text.heading, { color: theme.color.text }]}>
          {lemma.lemma}
        </Text>
        <Pressable onPress={() => speak(lemma.lemma)} hitSlop={10}>
          <Text style={{ fontSize: 20, color: theme.color.accent }}>🔊</Text>
        </Pressable>
      </View>
      <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.xs }]}>
        {metaParts.join(' ')}
      </Text>
      {clitics && clitics.length > 0 && (
        <Text
          style={[
            theme.text.tiny,
            {
              color: theme.color.textMuted,
              marginTop: 2,
              fontStyle: 'italic',
            },
          ]}
        >
          + {clitics.join(' + ')}
        </Text>
      )}
      <View style={{ marginTop: theme.space.md }}>
        {lemma.senses.slice(0, 5).map((sense, i) => (
          <View key={i} style={{ marginTop: i === 0 ? 0 : theme.space.sm }}>
            <Text style={[theme.text.body, { color: theme.color.text }]}>
              {i + 1}. {sense.definition}
            </Text>
            {sense.exampleEs && (
              <Text
                style={[
                  theme.text.tiny,
                  {
                    color: theme.color.textMuted,
                    marginTop: 2,
                    fontStyle: 'italic',
                  },
                ]}
              >
                {sense.exampleEs}
                {sense.exampleEn ? ` — ${sense.exampleEn}` : ''}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.deckRow, { marginTop: theme.space.xl }]}>
        {isCaptured ? (
          <Text style={[theme.text.bodyEm, { color: theme.color.textMuted }]}>
            ✓ in deck
          </Text>
        ) : (
          <Pressable
            onPress={onAddToDeck}
            disabled={captureLoading}
            style={[
              styles.addBtn,
              {
                backgroundColor: theme.color.accent,
                borderRadius: theme.radius.md,
                opacity: captureLoading ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[theme.text.bodyEm, { color: '#FFFFFF' }]}>
              {captureLoading ? 'Adding…' : 'Add to deck'}
            </Text>
          </Pressable>
        )}
        {captureError && (
          <Text style={[theme.text.tiny, { color: theme.color.textMuted }]}>
            {captureError}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  word: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  popover: { padding: 20, paddingBottom: 32, maxHeight: '70%' },
  popoverLoading: { paddingVertical: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { paddingVertical: 10, paddingHorizontal: 16 },
});
