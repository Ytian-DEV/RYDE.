import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface, InteractiveMap, PrimaryButton } from '@/components/ui';
import { formatPeso, RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import {
  BAYBAY_PLACES,
  calculateTierFare,
  PAYMENT_METHODS,
  RIDE_TIERS,
} from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

export default function MatchingScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination) ?? BAYBAY_PLACES[1]!;
  const selectedTierId = useRydeStore((s) => s.selectedTierId);
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const appliedPromo = useRydeStore((s) => s.appliedPromo);
  const assignDriver = useRydeStore((s) => s.assignDriver);
  const cancelActiveTrip = useRydeStore((s) => s.cancelActiveTrip);

  const tier = useMemo(
    () => RIDE_TIERS.find((t) => t.id === selectedTierId) ?? RIDE_TIERS[1]!,
    [selectedTierId]
  );

  const payment = useMemo(
    () =>
      PAYMENT_METHODS.find((p) => p.id === selectedPayment) ??
      PAYMENT_METHODS[0]!,
    [selectedPayment]
  );

  const fare = useMemo(
    () =>
      calculateTierFare(
        tier,
        pickup,
        destination,
        appliedPromo?.discountAmount ?? 0
      ),
    [tier, pickup, destination, appliedPromo]
  );

  const progress = useSharedValue(0.15);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 2400,
      easing: Easing.inOut(Easing.cubic),
    });

    const timer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      assignDriver();
      router.replace('/tracking');
    }, 2600);

    return () => clearTimeout(timer);
  }, [assignDriver, progress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    cancelActiveTrip();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <InteractiveMap pickup={pickup} destination={destination} showRadar />

      <View
        style={[
          styles.sheetWrap,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        <GlassSurface
          heavy
          radius={RADII.sheet}
          intensity={74}
          contentStyle={styles.sheetContent}
        >
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Finding your {tier.name}…
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Contacting top-rated drivers near {pickup.name.split(',')[0]} (3
              drivers nearby)
            </Text>
          </View>

          {/* Animated Progress Track */}
          <View style={[styles.track, { backgroundColor: colors.pill }]}>
            <Animated.View
              style={[
                styles.trackFill,
                { backgroundColor: colors.brandGold },
                progressBarStyle,
              ]}
            />
          </View>

          {/* Route Summary Card */}
          <View
            style={[
              styles.summaryCard,
              SQUIRCLE,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.summaryLeft}>
              <Text
                numberOfLines={1}
                style={[styles.summaryRoute, { color: colors.textPrimary }]}
              >
                {pickup.name.split(',')[0]} → {destination.name.split(',')[0]}
              </Text>
              <Text
                style={[
                  styles.summaryMeta,
                  TABULAR_NUMS,
                  { color: colors.textSecondary },
                ]}
              >
                {payment.shortLabel} • {fare.distanceKm.toFixed(1)} km
              </Text>
            </View>
            <Text
              style={[
                styles.summaryPrice,
                TABULAR_NUMS,
                { color: colors.textPrimary },
              ]}
            >
              {formatPeso(fare.totalFare)}
            </Text>
          </View>

          <PrimaryButton
            label="Cancel Request"
            variant="danger"
            onPress={handleCancel}
          />
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  summaryLeft: {
    flex: 1,
    gap: 2,
  },
  summaryRoute: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryMeta: {
    fontSize: 12,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
});
