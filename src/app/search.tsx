import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassIconButton,
  GlassSurface,
  InteractiveMap,
  PrimaryButton,
  SkeletonBox,
} from '@/components/ui';
import { NO_WEB_OUTLINE, RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  fetchNearbyPlaces,
  reverseGeocodeOSM,
  searchPlacesOSM,
} from '@/services/geoService';
import { useRydeStore } from '@/store/useRydeStore';
import { PlaceLocation } from '@/types';

export default function SearchLocationScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination);
  const setPickup = useRydeStore((s) => s.setPickup);
  const setDestination = useRydeStore((s) => s.setDestination);
  const swapStops = useRydeStore((s) => s.swapStops);
  const locateUserGps = useRydeStore((s) => s.locateUserGps);
  const loadingGps = useRydeStore((s) => s.loadingGps);

  const [activeField, setActiveField] = useState<'pickup' | 'destination'>(
    'destination'
  );
  const [query, setQuery] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceLocation[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [osmResults, setOsmResults] = useState<PlaceLocation[]>([]);
  const [searchingOsm, setSearchingOsm] = useState(false);

  // Manual map pin-picker state (decoupled from continuous GPS snapping)
  const [pinMode, setPinMode] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);
  const [pinnedPlace, setPinnedPlace] = useState<PlaceLocation | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const pinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoGpsRef = useRef(false);

  // Detect live GPS once if pickup is still the uninitialized default
  useEffect(() => {
    if (pickup.id === 'gps-current' && !didAutoGpsRef.current) {
      didAutoGpsRef.current = true;
      locateUserGps().catch(() => {});
    }
  }, [pickup.id, locateUserGps]);

  // Dynamically load nearby places & landmarks around the user's current location
  useEffect(() => {
    let cancelled = false;
    setLoadingNearby(true);
    fetchNearbyPlaces({ lat: pickup.lat, lng: pickup.lng })
      .then((places) => {
        if (!cancelled) {
          setNearbyPlaces(places);
          setLoadingNearby(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingNearby(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickup.lat, pickup.lng]);

  // Debounced live place search when typing a query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setOsmResults([]);
      setSearchingOsm(false);
      return;
    }

    let cancelled = false;
    setSearchingOsm(true);
    const timer = setTimeout(async () => {
      const results = await searchPlacesOSM(trimmed, {
        lat: pickup.lat,
        lng: pickup.lng,
      });
      if (!cancelled) {
        setOsmResults(results);
        setSearchingOsm(false);
      }
    }, 340);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, pickup.lat, pickup.lng]);

  const displayedPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      return nearbyPlaces;
    }
    const localFiltered = nearbyPlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
    const seen = new Set(localFiltered.map((p) => p.name.toLowerCase()));
    const merged = [...localFiltered];
    for (const item of osmResults) {
      if (!seen.has(item.name.toLowerCase())) {
        merged.push(item);
        seen.add(item.name.toLowerCase());
      }
    }
    return merged;
  }, [query, nearbyPlaces, osmResults]);

  const handleSelectPlace = (place: PlaceLocation) => {
    Haptics.selectionAsync().catch(() => {});
    if (activeField === 'pickup') {
      setPickup(place);
      setActiveField('destination');
      setQuery('');
    } else {
      setDestination(place);
      router.replace('/ride-tiers');
    }
  };

  const openPinPicker = () => {
    Haptics.selectionAsync().catch(() => {});
    const initialTarget =
      activeField === 'destination' && destination ? destination : pickup;
    setPinnedPlace(initialTarget);
    setPinMode(true);
  };

  // Called when the user pans/drags or taps the map in pinMode (never snaps back to GPS)
  const handlePinCenterChange = useCallback(
    (lat: number, lng: number) => {
      if (pinDebounceRef.current) {
        clearTimeout(pinDebounceRef.current);
      }
      setResolvingPin(true);
      pinDebounceRef.current = setTimeout(async () => {
        const resolved = await reverseGeocodeOSM(lat, lng, {
          lat: pickup.lat,
          lng: pickup.lng,
        });
        setPinnedPlace(resolved);
        setResolvingPin(false);
      }, 280);
    },
    [pickup.lat, pickup.lng]
  );

  const handleConfirmPinnedLocation = () => {
    if (!pinnedPlace) {
      setPinMode(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    if (activeField === 'pickup') {
      setPickup(pinnedPlace);
      setPinMode(false);
      setActiveField('destination');
      setQuery('');
    } else {
      setDestination(pinnedPlace);
      setPinMode(false);
      router.replace('/ride-tiers');
    }
  };

  const handlePinRecenterGps = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setResolvingPin(true);
    const loc = await locateUserGps();
    setResolvingPin(false);
    if (loc) {
      setPinnedPlace(loc);
    }
    setRecenterTrigger((c) => c + 1);
  };

  const handleUseCurrentGps = async () => {
    Haptics.selectionAsync().catch(() => {});
    const loc = await locateUserGps();
    if (loc && activeField === 'destination') {
      setDestination(loc);
    }
  };

  if (pinMode) {
    return (
      <View style={[styles.screenNoPad, { backgroundColor: colors.canvas }]}>
        <InteractiveMap
          pickup={pickup}
          destination={destination}
          pinMode
          pinTarget={activeField}
          recenterTrigger={recenterTrigger}
          onPinCenterChange={handlePinCenterChange}
        />

        {/* Fixed Center Pin Crosshair (moves freely over map as user pans) */}
        <View pointerEvents="none" style={styles.centerPinOverlay}>
          <View
            style={[
              styles.centerPinHead,
              SQUIRCLE,
              {
                backgroundColor:
                  activeField === 'pickup' ? colors.obsidian : colors.brandGold,
              },
            ]}
          >
            <Ionicons
              name={activeField === 'pickup' ? 'navigate' : 'location'}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View
            style={[
              styles.centerPinStem,
              {
                backgroundColor:
                  activeField === 'pickup' ? colors.obsidian : colors.brandGold,
              },
            ]}
          />
          <View style={styles.centerPinShadowDot} />
        </View>

        {/* Top Bar */}
        <View
          style={[
            styles.pinTopBar,
            { top: Math.max(insets.top, 14) + 10 },
          ]}
        >
          <GlassIconButton
            icon="chevron-back"
            accessibilityLabel="Exit map pin mode"
            onPress={() => setPinMode(false)}
          />
          <GlassSurface radius={RADII.pill} contentStyle={styles.pinBanner}>
            <Ionicons
              name={activeField === 'pickup' ? 'navigate' : 'location'}
              size={15}
              color={colors.brandGoldDeep}
            />
            <Text style={[styles.pinBannerText, { color: colors.textPrimary }]}>
              {`Drag map or tap to pin ${activeField === 'pickup' ? 'pick-up' : 'destination'}`}
            </Text>
          </GlassSurface>
        </View>

        {/* Explicit GPS Recenter Button (only recenters when user taps it) */}
        <View style={styles.pinRecenterWrap}>
          <GlassIconButton
            icon="locate"
            accessibilityLabel="Recenter map on my GPS location"
            onPress={handlePinRecenterGps}
          />
        </View>

        {/* Bottom Pin Confirmation Card */}
        <View
          style={[
            styles.pinBottomWrap,
            { bottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          <GlassSurface
            heavy
            radius={RADII.xl}
            contentStyle={styles.pinBottomCard}
          >
            <View style={styles.pinPreviewRow}>
              <View
                style={[
                  styles.fieldIconBadge,
                  SQUIRCLE,
                  {
                    backgroundColor:
                      activeField === 'pickup'
                        ? colors.obsidian
                        : colors.brandGold,
                  },
                ]}
              >
                <Ionicons
                  name={activeField === 'pickup' ? 'navigate' : 'location'}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.pinPreviewTextCol}>
                <Text
                  style={[styles.fieldTag, { color: colors.textTertiary }]}
                >
                  {activeField === 'pickup'
                    ? 'PINNED PICK-UP'
                    : 'PINNED DESTINATION'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.placeName, { color: colors.textPrimary }]}
                >
                  {resolvingPin
                    ? 'Detecting street address…'
                    : pinnedPlace?.name ?? 'Pinned Location'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.placeAddr, { color: colors.textSecondary }]}
                >
                  {pinnedPlace?.address ?? 'Drag map to adjust pin'}
                </Text>
              </View>
            </View>
            <PrimaryButton
              label={
                activeField === 'pickup'
                  ? 'Confirm Pick-Up Location'
                  : 'Confirm Destination'
              }
              loading={resolvingPin}
              loadingLabel="Locating pin…"
              onPress={handleConfirmPinnedLocation}
            />
          </GlassSurface>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.canvas,
          paddingTop: Math.max(insets.top, 16) + 10,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <GlassIconButton
          icon="chevron-back"
          accessibilityLabel="Back to home"
          onPress={() => router.back()}
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Plan your Ryde
        </Text>
      </View>

      {/* Dual Route Input Glass Card (Clean neutral borders, semantic icons, no orange focus outline) */}
      <GlassSurface radius={RADII.xl} contentStyle={styles.routeCard}>
        <Pressable
          onPress={() => {
            setActiveField('pickup');
            setQuery('');
          }}
          style={[
            styles.routeField,
            SQUIRCLE,
            {
              backgroundColor:
                activeField === 'pickup' ? colors.pill : 'transparent',
              borderColor:
                activeField === 'pickup' ? colors.borderSubtle : 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.fieldIconBadge,
              SQUIRCLE,
              { backgroundColor: colors.obsidian },
            ]}
          >
            <Ionicons name="navigate" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.routeInputWrap}>
            <Text style={[styles.fieldTag, { color: colors.textTertiary }]}>
              PICK-UP
            </Text>
            {activeField === 'pickup' ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={pickup.name}
                placeholderTextColor={colors.textSecondary}
                autoFocus
                style={[
                  styles.fieldInput,
                  NO_WEB_OUTLINE,
                  { color: colors.textPrimary },
                ]}
              />
            ) : (
              <Text
                numberOfLines={1}
                style={[styles.fieldValue, { color: colors.textPrimary }]}
              >
                {pickup.name}
              </Text>
            )}
          </View>
        </Pressable>

        <View
          style={[styles.routeDivider, { backgroundColor: colors.borderSubtle }]}
        />

        <Pressable
          onPress={() => {
            setActiveField('destination');
            setQuery('');
          }}
          style={[
            styles.routeField,
            SQUIRCLE,
            {
              backgroundColor:
                activeField === 'destination' ? colors.pill : 'transparent',
              borderColor:
                activeField === 'destination'
                  ? colors.borderSubtle
                  : 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.fieldIconBadge,
              SQUIRCLE,
              { backgroundColor: colors.brandGold },
            ]}
          >
            <Ionicons name="location" size={15} color={colors.textOnGold} />
          </View>
          <View style={styles.routeInputWrap}>
            <Text style={[styles.fieldTag, { color: colors.textTertiary }]}>
              DESTINATION
            </Text>
            {activeField === 'destination' ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  destination?.name ?? 'Where are you heading?'
                }
                placeholderTextColor={colors.textSecondary}
                autoFocus
                style={[
                  styles.fieldInput,
                  NO_WEB_OUTLINE,
                  { color: colors.textPrimary },
                ]}
              />
            ) : (
              <Text
                numberOfLines={1}
                style={[
                  styles.fieldValue,
                  {
                    color: destination
                      ? colors.textPrimary
                      : colors.textTertiary,
                  },
                ]}
              >
                {destination?.name ?? 'Set destination'}
              </Text>
            )}
          </View>
        </Pressable>
      </GlassSurface>

      {/* Quick Action Pills: Live GPS, Pin on Map & Swap Stops */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.actionScroll}
        contentContainerStyle={styles.actionRow}
      >
        <Pressable onPress={handleUseCurrentGps} accessibilityRole="button">
          <GlassSurface radius={RADII.pill} contentStyle={styles.actionPill}>
            <Ionicons name="locate" size={16} color={colors.brandGoldDeep} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              {loadingGps ? 'Locating…' : 'Current Location'}
            </Text>
          </GlassSurface>
        </Pressable>

        <Pressable onPress={openPinPicker} accessibilityRole="button">
          <GlassSurface radius={RADII.pill} contentStyle={styles.actionPill}>
            <Ionicons name="map-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              Choose on map
            </Text>
          </GlassSurface>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            swapStops();
          }}
          accessibilityRole="button"
        >
          <GlassSurface radius={RADII.pill} contentStyle={styles.actionPill}>
            <Ionicons
              name="swap-vertical"
              size={16}
              color={colors.textPrimary}
            />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              Swap stops
            </Text>
          </GlassSurface>
        </Pressable>
      </ScrollView>

      {/* Dynamic Nearby / Search Results Header */}
      <View style={styles.listHeaderRow}>
        <Text style={[styles.listSectionLabel, { color: colors.textTertiary }]}>
          {query.trim().length >= 2
            ? 'SEARCH RESULTS'
            : 'NEARBY PLACES & LANDMARKS'}
        </Text>
        {searchingOsm || loadingNearby ? (
          <ActivityIndicator size="small" color={colors.brandGoldDeep} />
        ) : null}
      </View>

      <FlatList
        data={displayedPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loadingNearby || searchingOsm ? (
            <View style={{ gap: 10 }}>
              {[0, 1, 2, 3].map((idx) => (
                <GlassSurface
                  key={idx}
                  radius={20}
                  contentStyle={styles.placeRow}
                >
                  <View style={styles.placeLeft}>
                    <SkeletonBox width={38} height={38} radius={13} />
                    <View style={[styles.placeTextCol, { gap: 6 }]}>
                      <SkeletonBox width={165} height={15} radius={6} />
                      <SkeletonBox width={210} height={12} radius={6} />
                    </View>
                  </View>
                  <SkeletonBox width={46} height={14} radius={6} />
                </GlassSurface>
              ))}
            </View>
          ) : (
            <GlassSurface radius={20} contentStyle={styles.emptyCard}>
              <Ionicons
                name="compass-outline"
                size={28}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No places found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Type a street, barangay, or landmark above, or tap “Choose on
                map” to drop a pin anywhere.
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelectPlace(item)}
            accessibilityRole="button"
          >
            <GlassSurface radius={20} contentStyle={styles.placeRow}>
              <View style={styles.placeLeft}>
                <View
                  style={[
                    styles.placeIcon,
                    SQUIRCLE,
                    { backgroundColor: colors.brandGoldSoft },
                  ]}
                >
                  <Ionicons
                    name={
                      item.category === 'campus'
                        ? 'school'
                        : item.category === 'store'
                          ? 'storefront'
                          : 'location'
                    }
                    size={18}
                    color={colors.brandGoldDeep}
                  />
                </View>
                <View style={styles.placeTextCol}>
                  <Text
                    numberOfLines={1}
                    style={[styles.placeName, { color: colors.textPrimary }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.placeAddr, { color: colors.textSecondary }]}
                  >
                    {item.address}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.placeDist,
                  TABULAR_NUMS,
                  { color: colors.textSecondary },
                ]}
              >
                {item.distanceKm.toFixed(1)} km
              </Text>
            </GlassSurface>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <PrimaryButton
          label="Confirm Route"
          disabled={!destination}
          onPress={() => router.replace('/ride-tiers')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  screenNoPad: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  routeCard: {
    padding: 10,
    gap: 8,
  },
  routeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  fieldIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInputWrap: {
    flex: 1,
    gap: 2,
  },
  fieldTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  routeDivider: {
    height: 1,
    marginHorizontal: 10,
  },
  actionScroll: {
    flexGrow: 0,
    marginTop: 14,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  placeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  placeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTextCol: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeAddr: {
    fontSize: 12,
  },
  placeDist: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingTop: 10,
  },
  pinTopBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 44,
  },
  pinBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerPinOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -46,
    width: 36,
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerPinHead: {
    width: 36,
    height: 36,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinStem: {
    width: 3,
    height: 10,
    borderRadius: 2,
  },
  centerPinShadowDot: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(24, 28, 35, 0.35)',
    marginTop: 1,
  },
  pinRecenterWrap: {
    position: 'absolute',
    right: 20,
    bottom: 210,
  },
  pinBottomWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  pinBottomCard: {
    padding: 16,
    gap: 14,
  },
  pinPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinPreviewTextCol: {
    flex: 1,
    gap: 2,
  },
});
