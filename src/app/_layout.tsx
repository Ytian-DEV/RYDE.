import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';
import { useRydeStore } from '@/store/useRydeStore';

export default function RootLayout() {
  const { isDark, colors } = useAppTheme();
  const hydrateFromSupabase = useRydeStore((s) => s.hydrateFromSupabase);
  const resetUserState = useRydeStore((s) => s.resetUserState);

  useEffect(() => {
    if (!supabase) return;
    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        resetUserState();
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        hydrateFromSupabase().catch(() => {});
      }
    });
    const subscription = authListener?.data?.subscription;
    return () => {
      subscription?.unsubscribe();
    };
  }, [hydrateFromSupabase, resetUserState]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.canvas }]}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="search"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="ride-tiers" />
            <Stack.Screen name="matching" options={{ animation: 'fade' }} />
            <Stack.Screen name="tracking" options={{ animation: 'fade' }} />
            <Stack.Screen name="summary" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="driver" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
