import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { prewarm } from '@/services/dictionary';

const queryClient = new QueryClient();

export default function RootLayout() {
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
