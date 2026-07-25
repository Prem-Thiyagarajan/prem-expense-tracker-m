import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AddSheetHost } from '@/components/AddSheetHost';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider, useAppFonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const t = useTheme();
  return <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />;
}

/** Renders the navigator and enforces auth-based route protection. */
function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'guest' && !inAuthGroup) router.replace('/login');
    else if (status === 'authed' && inAuthGroup) router.replace('/');
  }, [status, segments, router]);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null; // splash stays up during bootstrap

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ThemedStatusBar />
            <ToastProvider>
              <AuthProvider>
                <AddSheetHost>
                  <RootNavigator />
                </AddSheetHost>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
