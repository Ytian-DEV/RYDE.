import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface, PrimaryButton, SkeletonBox } from '@/components/ui';
import {
  formatPeso,
  RADII,
  SQUIRCLE,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';
import { TripRecord } from '@/types';

type FilterTab = 'all' | 'rides' | 'food' | 'services';

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rides', label: 'Rides' },
  { id: 'food', label: 'Food' },
  { id: 'services', label: 'Services' },
];

export default function OrdersScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const hydrating = useRydeStore((s) => s.hydrating);
  const trips = useRydeStore((s) => s.trips);
  const rebookTrip = useRydeStore((s) => s.rebookTrip);

  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<TripRecord | null>(
    null
  );

  const filteredTrips = useMemo(() => {
    if (filter === 'all') return trips;
    if (filter === 'rides') {
      return trips.filter(
        (t) => t.category === 'motor' || t.category === 'taxi'
      );
    }
    return trips.filter((t) => t.category === filter);
  }, [trips, filter]);

  const handleRebook = (trip: TripRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    rebookTrip(trip);
    router.push('/ride-tiers');
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.canvas,
          paddingTop: Math.max(insets.top, 16) + 12,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[TYPOGRAPHY.largeTitle, { color: colors.textPrimary }]}>
          Activity
        </Text>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setFilter(f.id);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterPill,
                  SQUIRCLE,
                  {
                    backgroundColor: active
                      ? colors.obsidian
                      : colors.elevated,
                    borderColor: active
                      ? colors.obsidian
                      : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: active ? colors.brandGold : colors.textPrimary,
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, 16) + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          hydrating ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((idx) => (
                <GlassSurface key={idx} radius={RADII.xl} contentStyle={styles.tripCard}>
                  <View style={styles.tripTop}>
                    <View style={styles.tripLeft}>
                      <SkeletonBox width={42} height={42} radius={14} />
                      <View style={[styles.tripMeta, { gap: 8 }]}>
                        <SkeletonBox width={160} height={15} radius={6} />
                        <SkeletonBox width={110} height={12} radius={6} />
                      </View>
                    </View>
                    <SkeletonBox width={54} height={18} radius={6} />
                  </View>
                </GlassSurface>
              ))}
            </View>
          ) : (
            <GlassSurface radius={RADII.xl} contentStyle={styles.emptyCard}>
              <Ionicons
                name="receipt-outline"
                size={34}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No activity in this category yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Completed rides, food deliveries, and errands will appear here.
              </Text>
            </GlassSurface>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setSelectedReceipt(item);
            }}
          >
            <GlassSurface radius={RADII.xl} contentStyle={styles.tripCard}>
              <View style={styles.tripTop}>
                <View style={styles.tripLeft}>
                  <View
                    style={[
                      styles.iconWrap,
                      SQUIRCLE,
                      { backgroundColor: colors.brandGoldSoft },
                    ]}
                  >
                    <Ionicons
                      name={
                        item.category === 'motor'
                          ? 'bicycle'
                          : item.category === 'food'
                            ? 'fast-food'
                            : 'car'
                      }
                      size={20}
                      color={colors.brandGoldDeep}
                    />
                  </View>
                  <View style={styles.tripMeta}>
                    <Text
                      numberOfLines={1}
                      style={[styles.tripDest, { color: colors.textPrimary }]}
                    >
                      {item.destination.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.tripSub, { color: colors.textSecondary }]}
                    >
                      {item.dateLabel} • {item.tierName}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.tripFare,
                    TABULAR_NUMS,
                    { color: colors.textPrimary },
                  ]}
                >
                  {formatPeso(item.totalFare)}
                </Text>
              </View>

              <View style={styles.tripBottom}>
                <View
                  style={[
                    styles.statusBadge,
                    SQUIRCLE,
                    { backgroundColor: colors.successSoft },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: colors.success }]}
                  >
                    {item.status}
                  </Text>
                </View>

                <Pressable
                  onPress={() => handleRebook(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rebook ride to ${item.destination.name}`}
                  style={[
                    styles.rebookBtn,
                    SQUIRCLE,
                    { backgroundColor: colors.brandGold },
                  ]}
                >
                  <Text
                    style={[styles.rebookText, { color: colors.textOnGold }]}
                  >
                    Rebook
                  </Text>
                </Pressable>
              </View>
            </GlassSurface>
          </Pressable>
        )}
      />

      {/* Trip Receipt Modal */}
      <Modal
        visible={!!selectedReceipt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedReceipt(null)}
          />
          {selectedReceipt ? (
            <View
              style={[
                styles.modalAnchor,
                { paddingBottom: Math.max(insets.bottom, 16) + 10 },
              ]}
            >
              <GlassSurface
                heavy
                radius={RADII.sheet}
                contentStyle={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { color: colors.textPrimary }]}
                  >
                    Trip Receipt
                  </Text>
                  <Pressable
                    onPress={() => setSelectedReceipt(null)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                </View>

                <Text
                  style={[styles.modalSub, { color: colors.textSecondary }]}
                >
                  {selectedReceipt.dateLabel} • Driver:{' '}
                  {selectedReceipt.driver.name} (
                  {selectedReceipt.driver.plateNumber})
                </Text>

                <View
                  style={[
                    styles.modalRoute,
                    SQUIRCLE,
                    { backgroundColor: colors.pill },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRouteLine,
                      { color: colors.textPrimary },
                    ]}
                  >
                    From: {selectedReceipt.pickup.name}
                  </Text>
                  <Text
                    style={[
                      styles.modalRouteLine,
                      { color: colors.textPrimary },
                    ]}
                  >
                    To: {selectedReceipt.destination.name}
                  </Text>
                </View>

                <View style={styles.recRows}>
                  <View style={styles.recRow}>
                    <Text style={{ color: colors.textSecondary }}>
                      Base Fare
                    </Text>
                    <Text
                      style={[
                        TABULAR_NUMS,
                        { color: colors.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {formatPeso(selectedReceipt.baseFare)}
                    </Text>
                  </View>
                  <View style={styles.recRow}>
                    <Text style={{ color: colors.textSecondary }}>
                      Distance ({selectedReceipt.distanceKm.toFixed(1)} km)
                    </Text>
                    <Text
                      style={[
                        TABULAR_NUMS,
                        { color: colors.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {formatPeso(selectedReceipt.distanceFare)}
                    </Text>
                  </View>
                  {selectedReceipt.tipAmount > 0 ? (
                    <View style={styles.recRow}>
                      <Text style={{ color: colors.textSecondary }}>Tip</Text>
                      <Text
                        style={[
                          TABULAR_NUMS,
                          { color: colors.textPrimary, fontWeight: '600' },
                        ]}
                      >
                        {formatPeso(selectedReceipt.tipAmount)}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />
                  <View style={styles.recRow}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 16,
                      }}
                    >
                      Total Paid
                    </Text>
                    <Text
                      style={[
                        TABULAR_NUMS,
                        {
                          color: colors.textPrimary,
                          fontWeight: '700',
                          fontSize: 18,
                        },
                      ]}
                    >
                      {formatPeso(selectedReceipt.totalFare)}
                    </Text>
                  </View>
                </View>

                <PrimaryButton
                  label="Rebook This Route"
                  onPress={() => {
                    const t = selectedReceipt;
                    setSelectedReceipt(null);
                    handleRebook(t);
                  }}
                />
              </GlassSurface>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
    gap: 14,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 22,
    gap: 12,
  },
  tripCard: {
    padding: 16,
    gap: 12,
  },
  tripTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tripLeft: {
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
  tripMeta: {
    flex: 1,
    gap: 2,
  },
  tripDest: {
    fontSize: 15,
    fontWeight: '600',
  },
  tripSub: {
    fontSize: 12,
  },
  tripFare: {
    fontSize: 16,
    fontWeight: '700',
  },
  tripBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rebookBtn: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rebookText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 32,
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
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 18, 26, 0.45)',
  },
  modalAnchor: {
    paddingHorizontal: 10,
  },
  modalContent: {
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
  },
  modalRoute: {
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  modalRouteLine: {
    fontSize: 13,
    fontWeight: '600',
  },
  recRows: {
    gap: 10,
  },
  recRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
});
