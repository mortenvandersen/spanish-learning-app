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

// Keep the splash visible while we load fonts. Without this the app would
// flash a system-font frame before the custom fonts arrive.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* preventAutoHideAsync rejects if it's already hidden; safe to ignore. */
});

export default function RootLayout() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [serifLoaded] = useSerifFonts({
    SourceSerif4_400Regular,
  });
  const fontsReady = interLoaded && serifLoaded;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  useEffect(() => {
    prewarm().catch(err => {
      console.warn('[dictionary] prewarm failed:', err);
    });
  }, []);

  if (!fontsReady) {
    return null;
  }

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
