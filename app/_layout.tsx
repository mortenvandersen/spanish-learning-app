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

const queryClient = new QueryClient();

// Hide the splash as soon as the JS bundle is mounted. The fonts load in
// the background; once they arrive, useFonts triggers a re-render and the
// custom typography swaps in. If we gate the whole tree on font readiness
// and either hook errors silently, the user is stuck on a blank screen —
// not worth that risk for a 200ms FOUT on first launch.
SplashScreen.hideAsync().catch(() => {});

export default function RootLayout() {
  // Calling the hooks is enough — their internal state change triggers a
  // re-render once each font file lands, and the React Native text engine
  // picks up the newly-available fontFamily on the next paint.
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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reader/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="grammar/[slug]" options={{ headerShown: true, title: '' }} />
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
