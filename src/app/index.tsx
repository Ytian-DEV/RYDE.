import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBadge, GlassSurface } from '@/components/ui';
import { RADII } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

export default function SplashScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useRydeStore((s) => s.isAuthenticated);

  const glowScale = useSharedValue(0.92);
  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    badgeOpacity.value = withTiming(1, { duration: 500 });
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 1250);

    return () => clearTimeout(timer);
  }, [badgeOpacity, glowScale, isAuthenticated]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const centerStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Animated.View
        style={[
          styles.ambientGlow,
          { backgroundColor: colors.brandGoldSoft },
          glowStyle,
        ]}
      />

      <Animated.View style={[styles.centerBlock, centerStyle]}>
        <BrandBadge size={108} fontSize={34} />
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Move effortlessly.
        </Text>
      </Animated.View>

      <View
        style={[
          styles.footerPillWrap,
          { bottom: Math.max(insets.bottom, 24) + 28 },
        ]}
      >
        <GlassSurface radius={RADII.pill} contentStyle={styles.footerPill}>
          <View
            style={[styles.liveDot, { backgroundColor: colors.success }]}
          />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Connecting to Baybay riders…
          </Text>
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  centerBlock: {
    alignItems: 'center',
    gap: 16,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  footerPillWrap: {
    position: 'absolute',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
