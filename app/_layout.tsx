import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  useFonts as useSerifFonts,
  SourceSerif4_400Regular,
} from '@expo-google-fonts/source-serif-4';
import { prewarm } from '@/services/dictionary';
import { useTheme } from '@/theme/useTheme';

const queryClient = new QueryClient();

// Hide splash on JS load — fonts swap in once loaded; see step-1 commit
// message for the reasoning.
SplashScreen.hideAsync().catch(() => {});

export default function RootLayout() {
  const theme = useTheme();

  useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  useSerifFonts({
    SourceSerif4_400Regular,
  });

  useEffect(() => {
    prewarm().catch(err => {
      console.warn('[dictionary] prewarm failed:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.color.bg },
            headerTitleStyle: {
              fontFamily: theme.fontFamily.sansSemibold,
              fontSize: 17,
              color: theme.color.text,
            },
            headerTintColor: theme.color.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.color.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(sections)/read/index" options={{ title: 'Read' }} />
          <Stack.Screen name="(sections)/study/index" options={{ title: 'Study' }} />
          <Stack.Screen name="(sections)/concepts/index" options={{ title: 'Concepts' }} />
          <Stack.Screen name="(sections)/grammar/index" options={{ title: 'Grammar' }} />
          <Stack.Screen name="reader/[id]" options={{ title: '' }} />
          <Stack.Screen name="concept/[id]" options={{ title: '' }} />
          <Stack.Screen name="grammar/[slug]" options={{ title: '' }} />
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
