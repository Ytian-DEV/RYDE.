import React, { useMemo, useState } from 'react';
import {
  Modal,
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
import { GlassSurface } from '@/components/ui';
import { RADII, SQUIRCLE, TABULAR_NUMS, TYPOGRAPHY } from '@/constants/theme';
import { BAYBAY_PLACES } from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';
import { DriverProfile, PlaceLocation } from '@/types';

export default function FavoritesScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const favorites = useRydeStore((s) => s.favorites);
  const trips = useRydeStore((s) => s.trips);
  const addFavorite = useRydeStore((s) => s.addFavorite);
  const removeFavorite = useRydeStore((s) => s.removeFavorite);
  const setDestination = useRydeStore((s) => s.setDestination);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const availableToAdd = useMemo(
    () =>
      BAYBAY_PLACES.filter(
        (p) => !favorites.some((f) => f.name.toLowerCase() === p.name.toLowerCase())
      ),
    [favorites]
  );

  // Derive favorite drivers strictly from real completed trips rated 4★ or higher
  const favoriteDrivers = useMemo(() => {
    const map = new Map<string, DriverProfile>();
    for (const t of trips) {
      if (
        t.status === 'Completed' &&
        (t.ratingGiven ?? 0) >= 4 &&
        t.driver.id &&
        t.driver.id !== 'unassigned' &&
        t.driver.id !== 'simulated-driver' &&
        !map.has(t.driver.id)
      ) {
        map.set(t.driver.id, t.driver);
      }
    }
    return [...map.values()];
  }, [trips]);

  const handleQuickBook = (place: PlaceLocation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDestination(place);
    router.push('/ride-tiers');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 104,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[TYPOGRAPHY.largeTitle, { color: colors.textPrimary }]}>
            Favorites
          </Text>
          {availableToAdd.length > 0 ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAddModalOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add saved place"
              style={[
                styles.addPill,
                SQUIRCLE,
                { backgroundColor: colors.brandGold },
              ]}
            >
              <Ionicons name="add" size={16} color={colors.textOnGold} />
              <Text style={[styles.addText, { color: colors.textOnGold }]}>
                Add Place
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          SAVED PLACES
        </Text>

        {favorites.length === 0 ? (
          <GlassSurface radius={RADII.xl} contentStyle={styles.emptyCard}>
            <Ionicons
              name="heart-outline"
              size={32}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No saved places yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tap “Add Place” above to save your frequent stops for one-tap
              booking.
            </Text>
          </GlassSurface>
        ) : (
          <View style={styles.list}>
            {favorites.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => handleQuickBook(place)}
                accessibilityRole="button"
                accessibilityLabel={`Book ride to ${place.name}`}
              >
                <GlassSurface radius={RADII.lg} contentStyle={styles.placeCard}>
                  <View style={styles.placeLeft}>
                    <View
                      style={[
                        styles.iconWrap,
                        SQUIRCLE,
                        { backgroundColor: colors.brandGoldSoft },
                      ]}
                    >
                      <Ionicons
                        name={
                          place.category === 'home'
                            ? 'home'
                            : place.category === 'campus'
                              ? 'school'
                              : 'location'
                        }
                        size={19}
                        color={colors.brandGoldDeep}
                      />
                    </View>
                    <View style={styles.placeText}>
                      <Text
                        numberOfLines={1}
                        style={[styles.placeName, { color: colors.textPrimary }]}
                      >
                        {place.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.placeAddr,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {place.address}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.placeRight}>
                    <Text
                      style={[
                        styles.placeEta,
                        TABULAR_NUMS,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {place.etaMinutes} min
                    </Text>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        removeFavorite(place.id);
                      }}
                      hitSlop={10}
                      accessibilityLabel={`Remove ${place.name} from favorites`}
                    >
                      <Ionicons name="heart" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </GlassSurface>
              </Pressable>
            ))}
          </View>
        )}

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textTertiary, marginTop: 12 },
          ]}
        >
          FAVORITE DRIVERS
        </Text>

        {favoriteDrivers.length === 0 ? (
          <GlassSurface radius={RADII.xl} contentStyle={styles.emptyCard}>
            <Ionicons
              name="car-outline"
              size={30}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No favorite drivers yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Drivers you rate 4★ or higher after completing a ride will appear
              here.
            </Text>
          </GlassSurface>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.driversRow}
          >
            {favoriteDrivers.map((drv) => (
              <GlassSurface
                key={drv.id}
                radius={RADII.lg}
                contentStyle={styles.driverCard}
              >
                <View
                  style={[
                    styles.driverAvatar,
                    { backgroundColor: colors.obsidian },
                  ]}
                >
                  <Text style={[styles.driverInit, { color: colors.brandGold }]}>
                    {drv.initials}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.driverName, { color: colors.textPrimary }]}
                >
                  {drv.name}
                </Text>
                <Text
                  style={[
                    styles.driverRating,
                    TABULAR_NUMS,
                    { color: colors.textSecondary },
                  ]}
                >
                  {drv.rating.toFixed(1)} ★ • {drv.vehicleModel}
                </Text>
              </GlassSurface>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* Add Place Modal */}
      <Modal
        visible={addModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAddModalOpen(false)}
          />
          <View
            style={[
              styles.modalAnchor,
              { paddingBottom: Math.max(insets.bottom, 16) + 10 },
            ]}
          >
            <GlassSurface
              heavy
              radius={RADII.sheet}
              contentStyle={styles.modalBox}
            >
              <View style={styles.modalHeader}>
                <Text
                  style={[styles.modalTitle, { color: colors.textPrimary }]}
                >
                  Save a Place
                </Text>
                <Pressable onPress={() => setAddModalOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              {availableToAdd.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    ).catch(() => {});
                    addFavorite(p);
                    setAddModalOpen(false);
                  }}
                  style={[
                    styles.addOption,
                    SQUIRCLE,
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <View style={styles.placeText}>
                    <Text
                      style={[styles.placeName, { color: colors.textPrimary }]}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={[
                        styles.placeAddr,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {p.address}
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle"
                    size={22}
                    color={colors.brandGoldDeep}
                  />
                </Pressable>
              ))}
            </GlassSurface>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  addText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  emptyCard: {
    padding: 26,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  list: {
    gap: 10,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  placeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeText: {
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
  placeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeEta: {
    fontSize: 13,
    fontWeight: '600',
  },
  driversRow: {
    gap: 12,
    paddingVertical: 2,
  },
  driverCard: {
    width: 176,
    padding: 16,
    gap: 8,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInit: {
    fontSize: 14,
    fontWeight: '800',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
  },
  driverRating: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 18, 26, 0.45)',
  },
  modalAnchor: {
    paddingHorizontal: 10,
  },
  modalBox: {
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
});
