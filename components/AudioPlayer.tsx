import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { describeError } from '@/services/errors';
import { speak } from '@/services/speech';
import {
  generateTts,
  MAX_TTS_TEXT_LENGTH,
  type Dialect,
  type Style,
} from '@/services/tts';
import { useTheme, type Theme } from '@/theme/useTheme';

interface AudioPlayerProps {
  text: string;
}

const DIALECT_OPTIONS: { label: string; value: Dialect }[] = [
  { label: 'Castilian', value: 'castilian' },
  { label: 'Mexican', value: 'mexican' },
];

const STYLE_OPTIONS: { label: string; value: Style }[] = [
  { label: 'Teacher', value: 'teacher' },
  { label: 'Conversational', value: 'conversational' },
  { label: 'Fast', value: 'fast' },
];

export function AudioPlayer({ text }: AudioPlayerProps) {
  const theme = useTheme();
  const [dialect, setDialect] = useState<Dialect>('mexican');
  const [style, setStyle] = useState<Style>('conversational');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const wantsToPlayRef = useRef(false);

  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = !!status?.playing;
  const isLoaded = !!status?.isLoaded;

  // Play even when the device's silent switch is on — this is a language
  // learning app, the user explicitly tapped Play.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      /* non-fatal — worst case audio respects silent switch */
    });
  }, []);

  // Once the audio finishes loading after a fresh fetch, auto-play it.
  useEffect(() => {
    if (wantsToPlayRef.current && audioUrl && isLoaded) {
      player.play();
      wantsToPlayRef.current = false;
    }
  }, [audioUrl, isLoaded, player]);

  // Selection changed → clear cached URL so the next play fetches the new combo.
  const handleDialectChange = (value: Dialect) => {
    if (value === dialect) return;
    setDialect(value);
    if (audioUrl) {
      player.pause();
      setAudioUrl(null);
    }
  };

  const handleStyleChange = (value: Style) => {
    if (value === style) return;
    setStyle(value);
    if (audioUrl) {
      player.pause();
      setAudioUrl(null);
    }
  };

  const tooLong = text.length > MAX_TTS_TEXT_LENGTH;
  const empty = text.trim().length === 0;
  const disabled = loading || empty;

  const handlePlayPress = async () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (audioUrl && isLoaded) {
      player.play();
      return;
    }
    if (tooLong) {
      // Skip the API call entirely for over-limit text — go straight to fallback.
      speak(text);
      return;
    }
    setError(null);
    setLoading(true);
    wantsToPlayRef.current = true;
    try {
      const result = await generateTts({ text, dialect, style });
      setAudioUrl(result.url);
    } catch (e) {
      wantsToPlayRef.current = false;
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleFallback = () => {
    speak(text);
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.color.surface, borderRadius: theme.radius.lg },
      ]}
    >
      <View style={styles.chipRow}>
        <ChipGroup
          options={DIALECT_OPTIONS}
          value={dialect}
          onChange={handleDialectChange}
          theme={theme}
        />
      </View>
      <View style={styles.chipRow}>
        <ChipGroup
          options={STYLE_OPTIONS}
          value={style}
          onChange={handleStyleChange}
          theme={theme}
        />
      </View>

      <View style={styles.playRow}>
        <Pressable
          onPress={handlePlayPress}
          disabled={disabled}
          style={[
            styles.playButton,
            {
              backgroundColor: disabled
                ? theme.color.accentMuted
                : theme.color.accent,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.playGlyph}>{isPlaying ? '❚❚' : '▶'}</Text>
          )}
        </Pressable>
        <View style={styles.statusCol}>
          {tooLong ? (
            <Text style={[theme.text.tiny, { color: theme.color.textMuted }]}>
              Too long for ElevenLabs — tap to play with system voice.
            </Text>
          ) : error ? (
            <Text style={[theme.text.tiny, { color: theme.color.danger }]} numberOfLines={2}>
              {error}
            </Text>
          ) : (
            <Text style={[theme.text.tiny, { color: theme.color.textMuted }]}>
              {isPlaying
                ? 'Playing…'
                : audioUrl
                  ? 'Tap to replay'
                  : 'Tap to listen'}
            </Text>
          )}
          {error && !tooLong && (
            <Pressable onPress={handleFallback} hitSlop={8} style={{ marginTop: 4 }}>
              <Text
                style={[
                  theme.text.tiny,
                  {
                    color: theme.color.accent,
                    fontFamily: theme.fontFamily.sansMedium,
                  },
                ]}
              >
                Play with system voice instead
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

interface ChipGroupProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  theme: Theme;
}

function ChipGroup<T extends string>({ options, value, onChange, theme }: ChipGroupProps<T>) {
  return (
    <View style={styles.chips}>
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.color.accent : theme.color.surfaceElevated,
                borderRadius: theme.radius.full,
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
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 12, gap: 8 },
  chipRow: { flexDirection: 'row' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  playButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: { fontSize: 18, color: '#FFFFFF', textAlign: 'center' },
  statusCol: { flex: 1 },
});
