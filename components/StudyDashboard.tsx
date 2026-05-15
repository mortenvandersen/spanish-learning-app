import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/theme/useTheme';
import type { StudyStats } from '@/types';

/**
 * Shared dashboard used by both decks. `extra` renders above the headline
 * numbers — the conjugation deck uses it for the "Released X / Y" line and
 * the release control.
 */
export function StudyDashboard({
  stats,
  extra,
}: {
  stats: StudyStats;
  extra?: ReactNode;
}) {
  const theme = useTheme();
  const now = new Date();
  const maxCount = Math.max(...stats.next7Days, 1);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {extra}
      <View style={styles.numbers}>
        <Stat label="Done today" value={stats.doneToday} theme={theme} />
        <Stat label="Due now" value={stats.dueNow} theme={theme} />
      </View>
      <View
        style={[
          styles.forecast,
          {
            borderTopColor: theme.color.border,
            paddingTop: theme.space.md,
            marginTop: theme.space.md,
          },
        ]}
      >
        {stats.next7Days.map((count, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() + i + 1);
          const day = d.toLocaleDateString('en-US', { weekday: 'short' });
          const heightFraction = count / maxCount;
          return (
            <View key={i} style={styles.day}>
              <Text
                style={[
                  theme.text.caption,
                  { color: theme.color.textMuted, fontSize: 10 },
                ]}
              >
                {day}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(2, heightFraction * 22),
                      backgroundColor:
                        count > 0 ? theme.color.accent : theme.color.border,
                      borderRadius: 2,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  theme.text.tiny,
                  {
                    color: count > 0 ? theme.color.text : theme.color.textDim,
                    fontFamily: theme.fontFamily.sansMedium,
                  },
                ]}
              >
                {count}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: Theme;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[theme.text.caption, { color: theme.color.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          theme.text.display,
          { color: theme.color.text, fontSize: 26, marginTop: 2 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 12 },
  numbers: { flexDirection: 'row', gap: 16 },
  statCell: { flex: 1 },
  forecast: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { height: 22, justifyContent: 'flex-end' },
  bar: { width: 6 },
});
