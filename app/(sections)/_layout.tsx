import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { HomeFooter } from '@/components/HomeFooter';
import { useTheme } from '@/theme/useTheme';

/**
 * Wraps every section page (Read, Study, Concepts, Grammar) so the
 * "← Home" footer is rendered consistently below the section content
 * without each screen having to know about it.
 */
export default function SectionsLayout() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <View style={styles.content}>
        <Slot />
      </View>
      <HomeFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
