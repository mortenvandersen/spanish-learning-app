import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

/**
 * Floating pill tab bar. The container fills the screen width below the
 * tab content with the screen background; the visible pill is centered
 * inside with a soft shadow so it reads as floating.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.color.bg }}>
      <View style={styles.wrap}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.color.surface,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const labelText =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : (options.title ?? route.name);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const tint = isFocused ? theme.color.accent : theme.color.textMuted;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isFocused ? theme.color.surfaceElevated : 'transparent',
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                {options.tabBarIcon &&
                  options.tabBarIcon({
                    focused: isFocused,
                    color: tint,
                    size: 22,
                  })}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color: tint,
                      fontFamily: theme.fontFamily.sansMedium,
                    },
                  ]}
                >
                  {labelText}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  bar: {
    flexDirection: 'row',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  label: { fontSize: 10, letterSpacing: 0.2 },
});
