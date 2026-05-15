import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

/**
 * Persistent "← Home" button rendered below every section screen. Rendered
 * by app/(sections)/_layout.tsx so each section file stays focused on its
 * own content.
 */
export function HomeFooter() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.wrap,
        {
          backgroundColor: theme.color.bg,
          borderTopColor: theme.color.border,
        },
      ]}
    >
      <Pressable onPress={() => router.navigate('/')} style={styles.btn}>
        <Text style={[theme.text.bodyEm, { color: theme.color.accent }]}>← Home</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth },
  btn: { paddingVertical: 14, alignItems: 'center' },
});
