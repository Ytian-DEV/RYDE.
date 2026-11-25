import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface, PrimaryButton } from '@/components/ui';
import { formatPeso, RADII, SQUIRCLE, TABULAR_NUMS, TYPOGRAPHY } from '@/constants/theme';
import {
  BAYBAY_PLACES,
  calculateTierFare,
  PAYMENT_METHODS,
  RIDE_TIERS,
} from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

const TIP_OPTIONS = [0, 10, 20, 50];

export default function RideSummaryScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination) ?? BAYBAY_PLACES[1]!;
  const driver = useRydeStore((s) => s.assignedDriver);
  const selectedTierId = useRydeStore((s) => s.selectedTierId);
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const appliedPromo = useRydeStore((s) => s.appliedPromo);
  const completeTripAndRate = useRydeStore((s) => s.completeTripAndRate);

  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(0);

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

  const grandTotal = fare.totalFare + tip;

  const handleDone = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await completeTripAndRate(rating, tip);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 20) + 24,
            paddingBottom: Math.max(insets.bottom, 20) + 18,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Arrival Hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.checkCircle,
              { backgroundColor: colors.successSoft },
            ]}
          >
            <Ionicons name="checkmark" size={34} color={colors.success} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            You’ve arrived!
          </Text>
          <Text
            style={[
              styles.heroSub,
              TABULAR_NUMS,
              { color: colors.textSecondary },
            ]}
          >
            {destination.name} • {Math.max(5, Math.round(fare.distanceKm * 2.5))}{' '}
            min • {fare.distanceKm.toFixed(1)} km
          </Text>
        </View>

        {/* Itemized Receipt Liquid Glass Card */}
        <GlassSurface radius={RADII.xl} contentStyle={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={[styles.recLabel, { color: colors.textSecondary }]}>
              Base Fare ({tier.name})
            </Text>
            <Text
              style={[
                styles.recVal,
                TABULAR_NUMS,
                { color: colors.textPrimary },
              ]}
            >
              {formatPeso(fare.baseFare)}
            </Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={[styles.recLabel, { color: colors.textSecondary }]}>
              Distance ({fare.distanceKm.toFixed(1)} km)
            </Text>
            <Text
              style={[
                styles.recVal,
                TABULAR_NUMS,
                { color: colors.textPrimary },
              ]}
            >
              {formatPeso(fare.distanceFare)}
            </Text>
          </View>

          {appliedPromo ? (
            <View style={styles.receiptRow}>
              <Text style={[styles.recLabel, { color: colors.success }]}>
                Promo ({appliedPromo.code})
              </Text>
              <Text
                style={[
                  styles.recVal,
                  TABULAR_NUMS,
                  { color: colors.success },
                ]}
              >
                -{formatPeso(appliedPromo.discountAmount)}
              </Text>
            </View>
          ) : null}

          {tip > 0 ? (
            <View style={styles.receiptRow}>
              <Text style={[styles.recLabel, { color: colors.textSecondary }]}>
                Driver Tip
              </Text>
              <Text
                style={[
                  styles.recVal,
                  TABULAR_NUMS,
                  { color: colors.textPrimary },
                ]}
              >
                {formatPeso(tip)}
              </Text>
            </View>
          ) : null}

          <View
            style={[styles.divider, { backgroundColor: colors.borderSubtle }]}
          />

          <View style={styles.receiptRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
              Total Paid via {payment.label}
            </Text>
            <Text
              style={[
                styles.totalVal,
                TYPOGRAPHY.fareDisplay,
                { color: colors.textPrimary },
              ]}
            >
              {formatPeso(grandTotal)}
            </Text>
          </View>
        </GlassSurface>

        {/* Rate Driver & Tip Glass Card */}
        <GlassSurface radius={RADII.xl} contentStyle={styles.rateCard}>
          <Text style={[styles.rateTitle, { color: colors.textPrimary }]}>
            How was your ride with {driver.name.split(' ')[0]}?
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setRating(star);
                }}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star} stars`}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={star <= rating ? '#F5B800' : colors.textTertiary}
                />
              </Pressable>
            ))}
          </View>

          <Text style={[styles.tipPrompt, { color: colors.textSecondary }]}>
            Add a tip for {driver.name.split(' ')[0]}
          </Text>

          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((amount) => {
              const active = tip === amount;
              return (
                <Pressable
                  key={amount}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setTip(amount);
                  }}
                  style={[
                    styles.tipPill,
                    SQUIRCLE,
                    {
                      backgroundColor: active ? colors.brandGold : colors.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tipPillText,
                      TABULAR_NUMS,
                      {
                        color: active ? colors.textOnGold : colors.textPrimary,
                      },
                    ]}
                  >
                    {amount === 0 ? 'No tip' : `₱${amount}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        <PrimaryButton label="Submit Rating & Done" onPress={handleDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    gap: 18,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  receiptCard: {
    padding: 18,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recLabel: {
    fontSize: 14,
  },
  recVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '700',
  },
  rateCard: {
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  rateTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipPrompt: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipPill: {
    paddingHorizontal: 15,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
});
