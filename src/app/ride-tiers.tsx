import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackgroundProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaymentScheduleSheet } from '@/components/sheets/PaymentScheduleSheet';
import {
  GlassIconButton,
  GlassSurface,
  InteractiveMap,
  PrimaryButton,
} from '@/components/ui';
import { formatPeso, RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import {
  BAYBAY_PLACES,
  calculateTierFare,
  PAYMENT_METHODS,
  RIDE_TIERS,
} from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

const GlassSheetBg: React.FC<BottomSheetBackgroundProps> = ({ style }) => (
  <GlassSurface
    heavy
    fill
    topOnly
    radius={RADII.sheet}
    intensity={80}
    style={style}
  />
);

export default function RideTiersScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination) ?? BAYBAY_PLACES[1]!;
  const routeGeometry = useRydeStore((s) => s.routeGeometry);
  const loadingRoute = useRydeStore((s) => s.loadingRoute);
  const refreshRoute = useRydeStore((s) => s.refreshRoute);
  const selectedTierId = useRydeStore((s) => s.selectedTierId);
  const setSelectedTierId = useRydeStore((s) => s.setSelectedTierId);
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const paymentReference = useRydeStore((s) => s.paymentReference);
  const setPaymentReference = useRydeStore((s) => s.setPaymentReference);
  const scheduledTimeLabel = useRydeStore((s) => s.scheduledTimeLabel);
  const appliedPromo = useRydeStore((s) => s.appliedPromo);
  const startRideRequest = useRydeStore((s) => s.startRideRequest);

  const snapPoints = useMemo(() => ['58%', '84%'], []);

  useEffect(() => {
    refreshRoute().catch(() => {});
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng, refreshRoute]);

  const currentPayment = useMemo(
    () =>
      PAYMENT_METHODS.find((p) => p.id === selectedPayment) ??
      PAYMENT_METHODS[0]!,
    [selectedPayment]
  );

  const selectedTier = useMemo(
    () => RIDE_TIERS.find((t) => t.id === selectedTierId) ?? RIDE_TIERS[1]!,
    [selectedTierId]
  );

  const selectedFare = useMemo(
    () =>
      calculateTierFare(
        selectedTier,
        pickup,
        destination,
        appliedPromo?.discountAmount ?? 0,
        routeGeometry?.distanceKm
      ),
    [selectedTier, pickup, destination, appliedPromo, routeGeometry]
  );

  const etaLabel = loadingRoute
    ? 'Calculating route…'
    : `${routeGeometry?.durationMin ?? Math.max(5, Math.round(selectedFare.distanceKm * 2.4))} min • ${selectedFare.distanceKm.toFixed(1)} km`;

  const showRefInput =
    selectedPayment === 'gcash' || selectedPayment === 'bank_transfer';

  const handleConfirm = async () => {
    setSubmitting(true);
    await startRideRequest();
    setSubmitting(false);
    router.replace('/matching');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <InteractiveMap
        pickup={pickup}
        destination={destination}
        routeCoords={routeGeometry?.coords}
        showRoute
        etaPillLabel={etaLabel}
      />

      {/* Top Floating Back + Route Pill */}
      <View
        pointerEvents="box-none"
        style={[styles.topBar, { top: Math.max(insets.top, 14) + 8 }]}
      >
        <GlassIconButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Pressable
          onPress={() => router.push('/search')}
          style={styles.routePillPress}
        >
          <GlassSurface radius={RADII.pill} contentStyle={styles.routePillInner}>
            <Text
              numberOfLines={1}
              style={[styles.routePillText, { color: colors.textPrimary }]}
            >
              {pickup.name.split(',')[0]} → {destination.name.split(',')[0]}
            </Text>
          </GlassSurface>
        </Pressable>
      </View>

      {/* Multi-Detent Ride Tier Selection Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundComponent={GlassSheetBg}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(24,28,35,0.18)',
          width: 40,
          height: 4,
        }}
        style={styles.sheetOuter}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 18 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Choose your Ryde
            </Text>
            {loadingRoute ? (
              <ActivityIndicator size="small" color={colors.brandGoldDeep} />
            ) : appliedPromo ? (
              <View
                style={[
                  styles.promoTag,
                  SQUIRCLE,
                  { backgroundColor: colors.successSoft },
                ]}
              >
                <Text style={[styles.promoTagText, { color: colors.success }]}>
                  {appliedPromo.code} (-₱{appliedPromo.discountAmount})
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tierList}>
            {RIDE_TIERS.map((tier) => {
              const selected = tier.id === selectedTierId;
              const fare = calculateTierFare(
                tier,
                pickup,
                destination,
                appliedPromo?.discountAmount ?? 0,
                routeGeometry?.distanceKm
              );
              return (
                <Pressable
                  key={tier.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedTierId(tier.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.tierCard,
                    SQUIRCLE,
                    {
                      backgroundColor: selected
                        ? colors.brandGoldSoft
                        : colors.elevated,
                      borderColor: selected
                        ? colors.brandGoldDeep
                        : colors.borderSubtle,
                      borderWidth: selected ? 1.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.tierLeft}>
                    <View
                      style={[
                        styles.tierIconBox,
                        SQUIRCLE,
                        {
                          backgroundColor: selected
                            ? colors.brandGold
                            : colors.pill,
                        },
                      ]}
                    >
                      <Ionicons
                        name={tier.icon}
                        size={22}
                        color={selected ? colors.textOnGold : colors.textPrimary}
                      />
                    </View>
                    <View style={styles.tierMeta}>
                      <View style={styles.tierNameRow}>
                        <Text
                          style={[
                            styles.tierName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {tier.name}
                        </Text>
                        {tier.badge ? (
                          <View
                            style={[
                              styles.tierBadge,
                              { backgroundColor: colors.pill },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tierBadgeText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {tier.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tierTagline,
                          TABULAR_NUMS,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {tier.tagline} • {tier.etaMinutes} min
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.tierPrice,
                      TABULAR_NUMS,
                      {
                        color:
                          selected && isDark
                            ? colors.brandGold
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {formatPeso(fare.totalFare)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Payment & Schedule Pills */}
          <View style={styles.metaRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setPaySheetOpen(true);
              }}
              style={[
                styles.metaPill,
                SQUIRCLE,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons
                name={currentPayment.icon}
                size={16}
                color={colors.textPrimary}
              />
              <Text
                numberOfLines={1}
                style={[styles.metaPillText, { color: colors.textPrimary }]}
              >
                {currentPayment.shortLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setPaySheetOpen(true);
              }}
              style={[
                styles.metaPill,
                SQUIRCLE,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.textPrimary}
              />
              <Text
                numberOfLines={1}
                style={[styles.metaPillText, { color: colors.textPrimary }]}
              >
                {scheduledTimeLabel}
              </Text>
            </Pressable>
          </View>

          {showRefInput ? (
            <View
              style={[
                styles.refBox,
                SQUIRCLE,
                {
                  backgroundColor: colors.pill,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={colors.textSecondary}
              />
              <TextInput
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder={`Optional ${currentPayment.label} Ref # (saved to receipt)`}
                placeholderTextColor={colors.textTertiary}
                style={[styles.refInput, { color: colors.textPrimary }]}
              />
            </View>
          ) : null}

          <PrimaryButton
            label={`Confirm ${selectedTier.name} • ${formatPeso(selectedFare.totalFare)}`}
            loading={submitting}
            onPress={handleConfirm}
          />
        </BottomSheetScrollView>
      </BottomSheet>

      <PaymentScheduleSheet
        visible={paySheetOpen}
        onClose={() => setPaySheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  routePillPress: {
    flex: 1,
  },
  routePillInner: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  routePillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheetOuter: {
    marginHorizontal: 0,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  promoTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  promoTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tierList: {
    gap: 10,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    minHeight: 68,
    gap: 10,
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tierIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierMeta: {
    flex: 1,
    gap: 2,
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tierTagline: {
    fontSize: 12,
  },
  tierPrice: {
    fontSize: 17,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  metaPill: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  metaPillText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  refInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
