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
  useColorScheme,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useCaptureWord, useUserWords } from '@/hooks/useUserWords';
import { lookup } from '@/services/dictionary';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import type { LookupResult } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

const SEARCH_DEBOUNCE_MS = 250;

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddWordModal({ visible, onClose }: AddWordModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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

  // Reset everything when the sheet closes. Intentionally depends only on
  // `visible` — useMutation's result object identity isn't stable across
  // renders, so including it would loop the effect (re-render -> new
  // captureMutation ref -> effect re-runs -> setters -> re-render).
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
          // Clear for the next entry; keep the modal open so the user can
          // add several words in a row without re-tapping the + button.
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
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: palette.background, borderTopColor: palette.border },
            ]}
            onPress={() => {
              /* absorb taps so the backdrop doesn't dismiss */
            }}
          >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: palette.text }]}>Add a word</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.close, { color: palette.muted }]}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Spanish word"
            placeholderTextColor={palette.muted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: scheme === 'dark' ? '#1f2123' : '#f5f5f5',
              },
            ]}
          />

          {isSearching && (
            <View style={styles.statusRow}>
              <ActivityIndicator />
            </View>
          )}

          {searchError && (
            <Text style={[styles.statusText, { color: palette.muted }]}>{searchError}</Text>
          )}

          {showNotFound && (
            <Text style={[styles.statusText, { color: palette.muted }]}>
              Not in dictionary.
            </Text>
          )}

          {result && (
            <ResultCard
              result={result}
              palette={palette}
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
  palette,
  isCaptured,
  captureLoading,
  captureError,
  onAdd,
}: {
  result: LookupResult;
  palette: Palette;
  isCaptured: boolean;
  captureLoading: boolean;
  captureError: string | null;
  onAdd: () => void;
}) {
  const { lemma, grammarFeatures, clitics } = result;
  const metaParts: string[] = [lemma.partOfSpeech];
  if (lemma.gender) metaParts.push(`(${lemma.gender})`);
  if (grammarFeatures && grammarFeatures !== 'unknown') metaParts.push(`— ${grammarFeatures}`);

  return (
    <ScrollView style={styles.result}>
      <View style={styles.lemmaRow}>
        <Text style={[styles.lemma, { color: palette.text }]}>{lemma.lemma}</Text>
        <Pressable onPress={() => speak(lemma.lemma)} hitSlop={10}>
          <Text style={[styles.speak, { color: palette.tint }]}>🔊</Text>
        </Pressable>
      </View>
      <Text style={[styles.meta, { color: palette.muted }]}>{metaParts.join(' ')}</Text>
      {clitics && clitics.length > 0 && (
        <Text style={[styles.clitics, { color: palette.muted }]}>
          + {clitics.join(' + ')}
        </Text>
      )}
      {lemma.senses.slice(0, 5).map((sense, i) => (
        <Text key={i} style={[styles.sense, { color: palette.text }]}>
          {i + 1}. {sense.definition}
        </Text>
      ))}

      <View style={styles.actionRow}>
        {isCaptured ? (
          <Text style={[styles.inDeck, { color: palette.muted }]}>✓ in deck</Text>
        ) : (
          <Pressable
            onPress={onAdd}
            disabled={captureLoading}
            style={[styles.addBtn, { borderColor: palette.tint }]}
          >
            <Text style={{ color: palette.tint, fontWeight: '600' }}>
              {captureLoading ? 'Adding…' : 'Add to deck'}
            </Text>
          </Pressable>
        )}
        {captureError && (
          <Text style={[styles.statusText, { color: palette.muted }]}>{captureError}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kbAvoid: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '80%',
    minHeight: 240,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '600' },
  close: { fontSize: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  statusRow: { marginTop: 16, alignItems: 'center' },
  statusText: { fontSize: 13, marginTop: 12 },
  result: { marginTop: 12, flexGrow: 0 },
  lemmaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lemma: { fontSize: 22, fontWeight: '600' },
  speak: { fontSize: 18 },
  meta: { fontSize: 13, marginTop: 4 },
  clitics: { fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  sense: { fontSize: 14, marginTop: 8 },
  actionRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  inDeck: { fontSize: 14, fontWeight: '500' },
});
