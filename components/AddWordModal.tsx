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
import {
  useCaptureCustomCard,
  useCaptureWord,
  useUserWords,
} from '@/hooks/useUserWords';
import { lookup } from '@/services/dictionary';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { LookupResult } from '@/types';

const SEARCH_DEBOUNCE_MS = 250;

type Mode = 'word' | 'custom';

const MODES: { label: string; value: Mode }[] = [
  { label: 'Spanish word', value: 'word' },
  { label: 'Custom card', value: 'custom' },
];

interface AddWordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddWordModal({ visible, onClose }: AddWordModalProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('word');

  useEffect(() => {
    if (!visible) setMode('word');
  }, [visible]);

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
                Add a card
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={[theme.text.heading, { color: theme.color.textMuted, fontSize: 20 }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ModeSwitcher value={mode} onChange={setMode} theme={theme} />

            {mode === 'word' ? (
              <WordLookupForm visible={visible} theme={theme} />
            ) : (
              <CustomCardForm visible={visible} theme={theme} />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModeSwitcher({
  value,
  onChange,
  theme,
}: {
  value: Mode;
  onChange: (m: Mode) => void;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.modeSwitcher,
        {
          backgroundColor: theme.color.bg,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      {MODES.map(m => {
        const selected = m.value === value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            style={[
              styles.modeBtn,
              {
                backgroundColor: selected ? theme.color.accent : 'transparent',
                borderRadius: theme.radius.sm,
              },
            ]}
          >
            <Text
              style={[
                theme.text.tiny,
                {
                  color: selected ? '#FFFFFF' : theme.color.text,
                  fontFamily: theme.fontFamily.sansMedium,
                },
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WordLookupForm({ visible, theme }: { visible: boolean; theme: Theme }) {
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
    <>
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
    </>
  );
}

function CustomCardForm({ visible, theme }: { visible: boolean; theme: Theme }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const customMutation = useCaptureCustomCard();

  useEffect(() => {
    if (!visible) {
      setFront('');
      setBack('');
      customMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const canSubmit = front.trim() !== '' && back.trim() !== '' && !customMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    customMutation.mutate(
      { front: front.trim(), back: back.trim() },
      {
        onSuccess: () => {
          setFront('');
          setBack('');
        },
      },
    );
  };

  const error = customMutation.error ? describeError(customMutation.error) : null;
  const justAdded = customMutation.isSuccess && front === '' && back === '';

  return (
    <View>
      <Text
        style={[
          theme.text.caption,
          { color: theme.color.textMuted, marginTop: theme.space.md },
        ]}
      >
        Front (question)
      </Text>
      <TextInput
        value={front}
        onChangeText={setFront}
        placeholder="e.g. When to use 'por'?"
        placeholderTextColor={theme.color.textDim}
        autoFocus
        multiline
        style={[
          styles.input,
          theme.text.body,
          {
            color: theme.color.text,
            borderColor: theme.color.border,
            backgroundColor: theme.color.bg,
            borderRadius: theme.radius.md,
            marginTop: theme.space.xs,
            minHeight: 44,
          },
        ]}
      />

      <Text
        style={[
          theme.text.caption,
          { color: theme.color.textMuted, marginTop: theme.space.md },
        ]}
      >
        Back (answer)
      </Text>
      <TextInput
        value={back}
        onChangeText={setBack}
        placeholder="e.g. Cause, exchange, duration, means"
        placeholderTextColor={theme.color.textDim}
        multiline
        style={[
          styles.input,
          theme.text.body,
          {
            color: theme.color.text,
            borderColor: theme.color.border,
            backgroundColor: theme.color.bg,
            borderRadius: theme.radius.md,
            marginTop: theme.space.xs,
            minHeight: 44,
          },
        ]}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[
          styles.addBtn,
          {
            backgroundColor: canSubmit ? theme.color.accent : theme.color.surface,
            borderRadius: theme.radius.md,
            marginTop: theme.space.lg,
          },
        ]}
      >
        <Text
          style={[
            theme.text.bodyEm,
            { color: canSubmit ? '#FFFFFF' : theme.color.textMuted },
          ]}
        >
          {customMutation.isPending ? 'Adding…' : 'Add to deck'}
        </Text>
      </Pressable>

      {justAdded && (
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.sm }]}>
          Added — type another or close.
        </Text>
      )}
      {error && (
        <Text style={[theme.text.tiny, { color: theme.color.textMuted, marginTop: theme.space.sm }]}>
          {error}
        </Text>
      )}
    </View>
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
    maxHeight: '85%',
    minHeight: 280,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeSwitcher: { flexDirection: 'row', padding: 3, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
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
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
