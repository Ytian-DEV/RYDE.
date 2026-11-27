import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { BrandBadge, GlassSurface } from '@/components/ui';
import { RADII } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';
import { useRydeStore } from '@/store/useRydeStore';

export default function OAuthCallbackScreen() {
  const { colors } = useAppTheme();
  const hydrateFromSupabase = useRydeStore((s) => s.hydrateFromSupabase);
  const [statusText, setStatusText] = useState('Completing sign in…');

  useEffect(() => {
    let active = true;

    const finishAuth = async () => {
      try {
        if (!supabase) {
          router.replace('/(auth)/login');
          return;
        }

        // Check if detectSessionInUrl on Web already exchanged the PKCE code
        const initialSession = await supabase.auth.getSession();

        if (!initialSession?.data?.session) {
          const currentUrl =
            typeof window !== 'undefined' && window.location?.href
              ? window.location.href
              : (await Linking.getInitialURL()) ?? '';

          if (currentUrl) {
            const parsed = new URL(currentUrl);
            const code = parsed.searchParams.get('code');
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            } else if (parsed.hash) {
              const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              if (accessToken && refreshToken) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              }
            }
          }
        }

        if (!active) return;
        setStatusText('Loading your Ryde profile…');
        const ok = await hydrateFromSupabase();
        if (!active) return;
        router.replace(ok ? '/(tabs)' : '/(auth)/login');
      } catch {
        if (active) router.replace('/(auth)/login');
      }
    };

    finishAuth();
    return () => {
      active = false;
    };
  }, [hydrateFromSupabase]);

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <BrandBadge size={82} fontSize={26} />
      <GlassSurface radius={RADII.pill} contentStyle={styles.pill}>
        <ActivityIndicator size="small" color={colors.brandGoldDeep} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {statusText}
        </Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
