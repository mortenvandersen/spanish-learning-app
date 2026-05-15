import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { StudyStats } from '@/types';

type Palette = (typeof Colors)['light' | 'dark'];

/**
 * Shared dashboard used by both decks. `extra` is rendered above the
 * "Done today / Due now" row — the conjugation deck uses it for the
 * "Released X / Y" line and the release control.
 */
export function StudyDashboard({
  stats,
  palette,
  extra,
}: {
  stats: StudyStats;
  palette: Palette;
  extra?: ReactNode;
}) {
  const now = new Date();
  return (
    <View style={[styles.dashboard, { borderColor: palette.border }]}>
      {extra}
      <View style={styles.row}>
        <Stat label="Done today" value={stats.doneToday} palette={palette} />
        <Stat label="Due now" value={stats.dueNow} palette={palette} />
      </View>
      <View style={[styles.forecast, { borderTopColor: palette.border }]}>
        {stats.next7Days.map((count, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() + i + 1);
          const day = d.toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <View key={i} style={styles.day}>
              <Text style={[styles.dayLabel, { color: palette.muted }]}>{day}</Text>
              <Text
                style={[
                  styles.dayCount,
                  { color: count > 0 ? palette.text : palette.muted },
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
  palette,
}: {
  label: string;
  value: number;
  palette: Palette;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 16 },
  statCell: { flex: 1 },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '600', marginTop: 2 },
  forecast: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  day: { flex: 1, alignItems: 'center' },
  dayLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },
  dayCount: { fontSize: 14, fontWeight: '500', marginTop: 2 },
});
