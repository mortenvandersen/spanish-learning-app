import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCaptureWord, useUserWords } from '@/hooks/useUserWords';
import { lookup } from '@/services/dictionary';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { LookupResult } from '@/types';

const SEARCH_DEBOUNCE_MS = 250;

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddWordModal({ visible, onClose }: AddWordModalProps) {
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { data: userWords } = useUserWords();
  const captureMutation = useCaptureWord();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced) {
      setResult(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    lookup(debounced)
      .then(r => {
        if (cancelled) return;
        setResult(r);
        setIsSearching(false);
      })
      .catch(e => {
        if (cancelled) return;
        setResult(null);
        setIsSearching(false);
        setSearchError(describeError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setDebounced('');
      setResult(null);
      setIsSearching(false);
      setSearchError(null);
      captureMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isCaptured =
    result !== null &&
    (userWords ?? []).some(
      w => w.spanish === result.lemma.lemma && w.partOfSpeech === result.lemma.partOfSpeech,
    );

  const handleAdd = () => {
    if (!result) return;
    captureMutation.mutate(
      {
        spanish: result.lemma.lemma,
        english: result.lemma.senses
          .slice(0, 5)
          .map(s => s.definition)
          .join('; '),
        partOfSpeech: result.lemma.partOfSpeech,
        sourcePassageId: null,
        sourceSentence: null,
      },
      {
        onSuccess: () => {
          setQuery('');
          setDebounced('');
          setResult(null);
        },
      },
    );
  };

  const showNotFound = !!debounced && !isSearching && result === null && !searchError;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.kbAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.color.backdrop }]}
          onPress={onClose}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.color.surfaceElevated,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
              },
            ]}
            onPress={() => {
              /* absorb taps so the backdrop doesn't dismiss */
            }}
          >
            <View style={styles.headerRow}>
              <Text style={[theme.text.subtitle, { color: theme.color.text }]}>
                Add a word
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={[theme.text.heading, { color: theme.color.textMuted, fontSize: 20 }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Spanish word"
              placeholderTextColor={theme.color.textDim}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              style={[
                styles.input,
                theme.text.body,
                {
                  color: theme.color.text,
                  borderColor: theme.color.border,
                  backgroundColor: theme.color.bg,
                  borderRadius: theme.radius.md,
                },
              ]}
            />

            {isSearching && (
              <View style={styles.statusRow}>
                <ActivityIndicator color={theme.color.accent} />
              </View>
            )}

            {searchError && (
              <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 12 }]}>
                {searchError}
              </Text>
            )}

            {showNotFound && (
              <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 12 }]}>
                Not in dictionary.
              </Text>
            )}

            {result && (
              <ResultCard
                result={result}
                theme={theme}
                isCaptured={isCaptured}
                captureLoading={captureMutation.isPending}
                captureError={
                  captureMutation.error ? describeError(captureMutation.error) : null
                }
                onAdd={handleAdd}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ResultCard({
  result,
  theme,
  isCaptured,
  captureLoading,
  captureError,
  onAdd,
}: {
  result: LookupResult;
  theme: Theme;
  isCaptured: boolean;
  captureLoading: boolean;
  captureError: string | null;
  onAdd: () => void;
}) {
  const { lemma, grammarFeatures, clitics } = result;
  const metaParts: string[] = [lemma.partOfSpeech];
  if (lemma.gender) metaParts.push(`(${lemma.gender})`);
  if (grammarFeatures && grammarFeatures !== 'unknown') metaParts.push(`· ${grammarFeatures}`);

  return (
    <ScrollView style={styles.result}>
      <View style={styles.lemmaRow}>
        <Text style={[theme.text.heading, { color: theme.color.text }]}>{lemma.lemma}</Text>
        <Pressable onPress={() => speak(lemma.lemma)} hitSlop={10}>
          <Text style={{ fontSize: 18, color: theme.color.accent }}>🔊</Text>
        </Pressable>
      </View>
      <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 4 }]}>
        {metaParts.join(' ')}
      </Text>
      {clitics && clitics.length > 0 && (
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: 2, fontStyle: 'italic' }]}>
          + {clitics.join(' + ')}
        </Text>
      )}
      {lemma.senses.slice(0, 5).map((sense, i) => (
        <Text
          key={i}
          style={[
            theme.text.body,
            { color: theme.color.text, marginTop: i === 0 ? 12 : 8 },
          ]}
        >
          {i + 1}. {sense.definition}
        </Text>
      ))}

      <View style={[styles.actionRow, { marginTop: theme.space.lg }]}>
        {isCaptured ? (
          <Text style={[theme.text.bodyEm, { color: theme.color.textMuted }]}>
            ✓ in deck
          </Text>
        ) : (
          <Pressable
            onPress={onAdd}
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
  kbAvoid: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    minHeight: 240,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusRow: { marginTop: 16, alignItems: 'center' },
  result: { marginTop: 12, flexGrow: 0 },
  lemmaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { paddingVertical: 10, paddingHorizontal: 16 },
});
