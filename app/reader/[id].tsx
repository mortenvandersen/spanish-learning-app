import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { lookup } from '@/services/dictionary';
import { tokenize } from '@/services/tokenize';
import type { LookupResult } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

interface PopoverState {
  surface: string;
  loading: boolean;
  result: LookupResult | null;
  error: string | null;
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { data: passage, isLoading, error } = usePassage(id);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const handleWordPress = useCallback(async (surface: string) => {
    setPopover({ surface, loading: true, result: null, error: null });
    try {
      const result = await lookup(surface);
      setPopover({ surface, loading: false, result, error: null });
    } catch (e) {
      setPopover({
        surface,
        loading: false,
        result: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

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
            {error instanceof Error ? error.message : String(error)}
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
          {tokens.map((tok, i) =>
            tok.kind === 'word' ? (
              <Text
                key={i}
                onPress={() => handleWordPress(tok.text)}
                style={styles.word}
              >
                {tok.text}
              </Text>
            ) : (
              <Text key={i}>{tok.text}</Text>
            ),
          )}
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
            {popover && <PopoverContent state={popover} palette={palette} />}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function PopoverContent({ state, palette }: { state: PopoverState; palette: Palette }) {
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
  const metaParts: string[] = [lemma.partOfSpeech];
  if (lemma.gender) metaParts.push(`(${lemma.gender})`);
  if (grammarFeatures && grammarFeatures !== 'unknown') metaParts.push(`— ${grammarFeatures}`);

  return (
    <ScrollView style={{ flexGrow: 0 }}>
      <Text style={[styles.popoverTitle, { color: palette.text }]}>{lemma.lemma}</Text>
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
});
