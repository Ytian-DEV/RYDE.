import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
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
import { supabase } from '@/lib/supabase';
import { subscribeToRide } from '@/services/rydeApi';
import { useRydeStore } from '@/store/useRydeStore';

export default function MatchingScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isLiveBackend = useRydeStore((s) => s.isLiveBackend);
  const activeRide = useRydeStore((s) => s.activeRide);
  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination) ?? BAYBAY_PLACES[1]!;
  const routeGeometry = useRydeStore((s) => s.routeGeometry);
  const selectedTierId = useRydeStore((s) => s.selectedTierId);
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const appliedPromo = useRydeStore((s) => s.appliedPromo);
  const assignDriver = useRydeStore((s) => s.assignDriver);
  const syncLiveRideUpdate = useRydeStore((s) => s.syncLiveRideUpdate);
  const appendRealtimeMessage = useRydeStore((s) => s.appendRealtimeMessage);
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
        appliedPromo?.discountAmount ?? 0,
        routeGeometry?.distanceKm
      ),
    [tier, pickup, destination, appliedPromo, routeGeometry]
  );

  const progress = useSharedValue(0.2);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.22, { duration: 1100, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );
  }, [progress]);

  // Live Supabase Realtime listener waiting for a Driver to accept
  useEffect(() => {
    if (activeRide && isLiveBackend) {
      const channel = subscribeToRide(
        activeRide.id,
        async (updatedRide) => {
          await syncLiveRideUpdate(updatedRide);
          if (
            updatedRide.status === 'accepted' ||
            updatedRide.status === 'arrived' ||
            updatedRide.status === 'in_trip'
          ) {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            ).catch(() => {});
            router.replace('/tracking');
          }
        },
        (msg) => appendRealtimeMessage(msg)
      );
      return () => {
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
      };
    }

    // Local preview auto-match after 2.6s
    const timer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      assignDriver();
      router.replace('/tracking');
    }, 2600);
    return () => clearTimeout(timer);
  }, [
    activeRide,
    isLiveBackend,
    assignDriver,
    syncLiveRideUpdate,
    appendRealtimeMessage,
  ]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  const handleSimulateMatch = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    assignDriver();
    router.replace('/tracking');
  };

  const handleCancel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await cancelActiveTrip();
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
          topOnly
          radius={RADII.sheet}
          intensity={80}
          contentStyle={styles.sheetContent}
        >
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Finding your {tier.name}…
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {activeRide
                ? 'Live request broadcast via Supabase Realtime! Online drivers can accept right now.'
                : `Contacting top-rated drivers near ${pickup.name.split(',')[0]}…`}
            </Text>
          </View>

          <View style={[styles.track, { backgroundColor: colors.pill }]}>
            <Animated.View
              style={[
                styles.trackFill,
                { backgroundColor: colors.brandGold },
                progressBarStyle,
              ]}
            />
          </View>

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

          {activeRide ? (
            <View style={styles.helperRow}>
              <Pressable
                onPress={() => router.push('/driver')}
                style={[
                  styles.helperPill,
                  SQUIRCLE,
                  { backgroundColor: colors.brandGoldSoft },
                ]}
              >
                <Text
                  style={[styles.helperText, { color: colors.textPrimary }]}
                >
                  Open Driver Mode
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSimulateMatch}
                style={[
                  styles.helperPill,
                  SQUIRCLE,
                  { backgroundColor: colors.pill },
                ]}
              >
                <Text
                  style={[styles.helperText, { color: colors.textPrimary }]}
                >
                  Simulate Match
                </Text>
              </Pressable>
            </View>
          ) : null}

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
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 14,
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
  helperRow: {
    flexDirection: 'row',
    gap: 10,
  },
  helperPill: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
