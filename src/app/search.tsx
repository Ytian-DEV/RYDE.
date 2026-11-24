import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
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
} from '@/components/ui';
import { RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import { BAYBAY_PLACES } from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
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

  const [activeField, setActiveField] = useState<'pickup' | 'destination'>(
    'destination'
  );
  const [query, setQuery] = useState('');
  const [pinMode, setPinMode] = useState(false);

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BAYBAY_PLACES;
    return BAYBAY_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [query]);

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

  const handleMapPin = (mapX: number, mapY: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const customPin: PlaceLocation = {
      id: `pin-${Date.now()}`,
      name:
        activeField === 'pickup'
          ? 'Pinned Pickup, Baybay'
          : 'Pinned Destination, VSU',
      address: `Pinned location (${(10.74 + mapY * 0.02).toFixed(4)}, ${(124.79 + mapX * 0.02).toFixed(4)})`,
      distanceKm: 2.6,
      etaMinutes: 6,
      lat: 10.72 + mapY * 0.04,
      lng: 124.78 + mapX * 0.03,
      mapX,
      mapY,
    };
    if (activeField === 'pickup') {
      setPickup(customPin);
    } else {
      setDestination(customPin);
    }
    setPinMode(false);
  };

  if (pinMode) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
        <InteractiveMap
          pickup={pickup}
          destination={destination}
          pinMode
          onPinSelect={handleMapPin}
        />
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
            <Text style={[styles.pinBannerText, { color: colors.textPrimary }]}>
              Tap map to pin {activeField === 'pickup' ? 'pick-up' : 'destination'}
            </Text>
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

      {/* Dual Route Input Glass Card */}
      <GlassSurface radius={RADII.xl} contentStyle={styles.routeCard}>
        <Pressable
          onPress={() => setActiveField('pickup')}
          style={[
            styles.routeField,
            SQUIRCLE,
            activeField === 'pickup' && {
              backgroundColor: colors.brandGoldSoft,
            },
          ]}
        >
          <View style={[styles.pinDot, { backgroundColor: colors.success }]} />
          <View style={styles.routeInputWrap}>
            <Text style={[styles.fieldTag, { color: colors.textTertiary }]}>
              PICK-UP
            </Text>
            {activeField === 'pickup' ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={pickup.name}
                placeholderTextColor={colors.textPrimary}
                autoFocus
                style={[styles.fieldInput, { color: colors.textPrimary }]}
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
          onPress={() => setActiveField('destination')}
          style={[
            styles.routeField,
            SQUIRCLE,
            activeField === 'destination' && {
              backgroundColor: colors.brandGoldSoft,
            },
          ]}
        >
          <View style={[styles.pinDot, { backgroundColor: colors.danger }]} />
          <View style={styles.routeInputWrap}>
            <Text style={[styles.fieldTag, { color: colors.textTertiary }]}>
              DESTINATION
            </Text>
            {activeField === 'destination' ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={destination?.name ?? 'Search destination…'}
                placeholderTextColor={
                  destination ? colors.textPrimary : colors.textTertiary
                }
                autoFocus
                style={[styles.fieldInput, { color: colors.textPrimary }]}
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

      {/* Quick Action Pills: Pin on Map & Swap Stops */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setPinMode(true);
          }}
          accessibilityRole="button"
        >
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
      </View>

      {/* Suggested & Saved Places List */}
      <Text style={[styles.listSectionLabel, { color: colors.textTertiary }]}>
        SAVED & RECENT PLACES
      </Text>

      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
                    name="location"
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
  },
  pinDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 18,
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
  listSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
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
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  pinBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
