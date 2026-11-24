import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import {
  PAYMENT_METHODS,
  SERVICE_ITEMS,
} from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';
import { PlaceLocation } from '@/types';

const LiquidGlassSheetBackground: React.FC<BottomSheetBackgroundProps> = ({
  style,
}) => (
  <GlassSurface
    heavy
    fill
    topOnly
    radius={RADII.sheet}
    intensity={80}
    style={[style, styles.sheetOuterShadow]}
  />
);

export default function HomeMapScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const [paySheetOpen, setPaySheetOpen] = useState(false);

  const selectedService = useRydeStore((s) => s.selectedService);
  const setSelectedService = useRydeStore((s) => s.setSelectedService);
  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination);
  const routeGeometry = useRydeStore((s) => s.routeGeometry);
  const setDestination = useRydeStore((s) => s.setDestination);
  const refreshRoute = useRydeStore((s) => s.refreshRoute);
  const locateUserGps = useRydeStore((s) => s.locateUserGps);
  const loadingGps = useRydeStore((s) => s.loadingGps);
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const scheduledTimeLabel = useRydeStore((s) => s.scheduledTimeLabel);
  const favorites = useRydeStore((s) => s.favorites);

  const snapPoints = useMemo(() => ['52%', '74%'], []);

  useEffect(() => {
    if (pickup.id === 'gps-current') {
      locateUserGps().catch(() => {});
    }
    if (destination) {
      refreshRoute().catch(() => {});
    }
  }, [pickup.id, destination, locateUserGps, refreshRoute]);

  const currentPayment = useMemo(
    () =>
      PAYMENT_METHODS.find((p) => p.id === selectedPayment) ??
      PAYMENT_METHODS[0]!,
    [selectedPayment]
  );

  const quickChips = useMemo(() => favorites.slice(0, 3), [favorites]);

  const handleQuickDestination = useCallback(
    (place: PlaceLocation) => {
      Haptics.selectionAsync().catch(() => {});
      setDestination(place);
      router.push('/ride-tiers');
    },
    [setDestination]
  );

  const handleBookNow = useCallback(() => {
    if (!destination) {
      router.push('/search');
      return;
    }
    router.push('/ride-tiers');
  }, [destination]);

  const handleRecenter = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    sheetRef.current?.snapToIndex(0);
    const found = await locateUserGps();
    if (!found) {
      Alert.alert(
        'Location Permission',
        'Enable location permissions in your device settings to auto-detect your live GPS pickup point.'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Live Interactive OpenStreetMap */}
      <InteractiveMap
        pickup={pickup}
        destination={destination}
        routeCoords={routeGeometry?.coords}
        showRoute={false}
      />

      {/* Top Floating Liquid Glass Location Bar + Notifications */}
      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { top: Math.max(insets.top, 14) + 8 }]}
      >
        <Pressable
          onPress={() => router.push('/search')}
          style={styles.locPillPress}
          accessibilityRole="button"
          accessibilityLabel="Change current pickup location"
        >
          <GlassSurface radius={RADII.pill} contentStyle={styles.locPillInner}>
            <View
              style={[styles.statusDot, { backgroundColor: colors.success }]}
            />
            <Text
              numberOfLines={1}
              style={[styles.locPillText, { color: colors.textPrimary }]}
            >
              {loadingGps ? 'Locating GPS…' : pickup.name}
            </Text>
            <Ionicons
              name="chevron-down"
              size={15}
              color={colors.textSecondary}
            />
          </GlassSurface>
        </Pressable>

        <GlassIconButton
          icon="car-sport-outline"
          accessibilityLabel="Switch to Driver Mode"
          onPress={() => router.push('/driver')}
        />
      </View>

      {/* Floating Live GPS Recenter Button */}
      <View style={styles.recenterWrap}>
        <GlassIconButton
          icon="locate"
          accessibilityLabel="Detect my current GPS location"
          onPress={handleRecenter}
        />
      </View>

      {/* Multi-Detent iOS 26 Liquid Glass Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundComponent={LiquidGlassSheetBackground}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.24)'
            : 'rgba(24, 28, 35, 0.18)',
          width: 40,
          height: 4,
        }}
        style={styles.bottomSheetOuter}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 96 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 4 Compact Squircle Service Tiles */}
          <View style={styles.serviceGrid}>
            {SERVICE_ITEMS.map((item) => {
              const active = selectedService === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedService(item.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.serviceTile,
                    SQUIRCLE,
                    {
                      backgroundColor: active
                        ? colors.brandGoldSoft
                        : colors.pill,
                      borderColor: active
                        ? colors.brandGoldDeep
                        : colors.borderSubtle,
                      borderWidth: active ? 1.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={
                      active && isDark ? colors.brandGold : colors.textPrimary
                    }
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.serviceName, { color: colors.textPrimary }]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.servicePrice,
                      TABULAR_NUMS,
                      { color: colors.textSecondary },
                    ]}
                  >
                    ₱{item.startingFare}+
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Primary "Where are you heading?" Search Bar */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push('/search');
            }}
            accessibilityRole="button"
            accessibilityLabel="Search destination"
            style={[
              styles.searchBar,
              SQUIRCLE,
              {
                backgroundColor: colors.pill,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.searchIconWrap,
                { backgroundColor: colors.brandGold },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textOnGold} />
            </View>
            <View style={styles.searchTextCol}>
              <Text
                numberOfLines={1}
                style={[styles.searchTitle, { color: colors.textPrimary }]}
              >
                {destination ? destination.name : 'Where are you heading?'}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.searchSub, { color: colors.textSecondary }]}
              >
                From {pickup.name}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>

          {/* Quick Saved Destination Chips (strictly user's own saved favorites) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {quickChips.length === 0 ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push('/(tabs)/favorites');
                }}
                style={[
                  styles.quickChip,
                  SQUIRCLE,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={colors.brandGoldDeep}
                />
                <Text
                  style={[styles.quickChipText, { color: colors.textSecondary }]}
                >
                  Save a favorite place
                </Text>
              </Pressable>
            ) : (
              quickChips.map((place) => (
                <Pressable
                  key={place.id}
                  onPress={() => handleQuickDestination(place)}
                  style={[
                    styles.quickChip,
                    SQUIRCLE,
                    {
                      backgroundColor: colors.elevated,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      place.category === 'home'
                        ? 'home-outline'
                        : place.category === 'campus'
                          ? 'school-outline'
                          : 'location-outline'
                    }
                    size={14}
                    color={colors.brandGoldDeep}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.quickChipText, { color: colors.textPrimary }]}
                  >
                    {place.name.split(',')[0]}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Payment Method & Pickup Time Pills */}
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

          {/* Primary Thumb-Zone CTA */}
          <PrimaryButton label="Book Now" onPress={handleBookNow} />
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
  topOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 20,
  },
  locPillPress: {
    flex: 1,
    maxWidth: 270,
  },
  locPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  locPillText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  recenterWrap: {
    position: 'absolute',
    right: 20,
    top: '41%',
    zIndex: 15,
  },
  bottomSheetOuter: {
    marginHorizontal: 0,
  },
  sheetOuterShadow: {
    marginHorizontal: 0,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    gap: 13,
  },
  serviceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceTile: {
    flex: 1,
    height: 82,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: 11,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 12,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTextCol: {
    flex: 1,
    gap: 1,
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchSub: {
    fontSize: 12,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
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
});
