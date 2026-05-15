import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.color.bg },
        headerTitleStyle: { ...theme.text.subtitle, color: theme.color.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.color.bg },
        tabBarStyle: {
          backgroundColor: theme.color.bg,
          borderTopColor: theme.color.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textDim,
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.sansMedium,
          fontSize: 10,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="read"
        options={{
          title: 'Read',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'albums' : 'albums-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="grammar"
        options={{
          title: 'Grammar',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
