import {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { AppDialogHost } from '../components/AppDialog';
import { isAuthSessionValid, isAutoLockSuppressed } from '../lib/security';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme/tokens';

const PROTECTED_SEGMENTS = new Set(['(tabs)', 'add-transaction', 'add-order', 'order-detail']);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const isReady = useAppStore((s) => s.isReady);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const bootstrap = useAppStore((s) => s.bootstrap);

  const segments = useSegments();
  const appStateRef = useRef<string | null | undefined>(AppState.currentState);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Period-based lock (1 hour): only lock on returning from background if the 1-hour session expired
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        prevState === 'background' &&
        nextState === 'active' &&
        isAuthenticated &&
        !isAutoLockSuppressed()
      ) {
        const stillValid = await isAuthSessionValid();
        if (!stillValid) {
          setAuthenticated(false);
        }
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, setAuthenticated]);

  // Route protection guard
  useEffect(() => {
    if (!isReady || !fontsLoaded) return;
    const firstSegment = segments[0] as string | undefined;
    const inProtectedRoute = firstSegment ? PROTECTED_SEGMENTS.has(firstSegment) : false;

    if (!isAuthenticated && inProtectedRoute) {
      router.replace(isOnboarded ? '/login' : '/');
    } else if (!isAuthenticated && isOnboarded && !firstSegment) {
      router.replace('/login');
    } else if (isAuthenticated && (!firstSegment || firstSegment === 'login')) {
      router.replace('/(tabs)');
    }
  }, [isReady, fontsLoaded, isAuthenticated, isOnboarded, segments]);

  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-transaction"
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="add-order"
          options={{
            presentation: 'card',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="order-detail"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="credits"
          options={{
            presentation: 'card',
          }}
        />
      </Stack>
      <AppDialogHost />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
