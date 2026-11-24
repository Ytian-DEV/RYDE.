import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

export default function LiveTrackingScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const pickup = useRydeStore((s) => s.pickup);
  const destination = useRydeStore((s) => s.destination) ?? BAYBAY_PLACES[1]!;
  const driver = useRydeStore((s) => s.assignedDriver);
  const tripStatus = useRydeStore((s) => s.tripStatus);
  const driverEtaMin = useRydeStore((s) => s.driverEtaMin);
  const selectedTierId = useRydeStore((s) => s.selectedTierId);
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const appliedPromo = useRydeStore((s) => s.appliedPromo);
  const advanceTripPhase = useRydeStore((s) => s.advanceTripPhase);
  const chatMessages = useRydeStore((s) => s.chatMessages);
  const sendChatMessage = useRydeStore((s) => s.sendChatMessage);
  const emergencyContacts = useRydeStore((s) => s.emergencyContacts);

  const [driverProgress, setDriverProgress] = useState(0.22);
  const [chatOpen, setChatOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [draftMsg, setDraftMsg] = useState('');

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

  // Smoothly animate driver along route
  useEffect(() => {
    const id = setInterval(() => {
      setDriverProgress((prev) => {
        const cap = tripStatus === 'in_trip' ? 0.94 : 0.48;
        if (prev >= cap) return prev;
        return Number((prev + 0.035).toFixed(3));
      });
    }, 900);
    return () => clearInterval(id);
  }, [tripStatus]);

  const handleAdvance = () => {
    if (tripStatus === 'accepted' || tripStatus === 'arrived') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      advanceTripPhase();
      setDriverProgress(0.55);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      advanceTripPhase();
      router.replace('/summary');
    }
  };

  const handleShareTrip = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      await Share.share({
        message: `I'm riding with ${driver.name} (${driver.vehicleModel} ${driver.plateNumber}) via Ryde. from ${pickup.name} to ${destination.name}. ETA: ${driverEtaMin} min.`,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleSendChat = () => {
    if (!draftMsg.trim()) return;
    Haptics.selectionAsync().catch(() => {});
    sendChatMessage(draftMsg);
    setDraftMsg('');
  };

  const bannerHeadline =
    tripStatus === 'in_trip'
      ? `Heading to ${destination.name.split(',')[0]}`
      : `Kuya ${driver.name.split(' ')[0]} is arriving`;

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <InteractiveMap
        pickup={pickup}
        destination={destination}
        showRoute
        driverProgress={driverProgress}
      />

      {/* Top Floating Liquid Glass Live Status Banner */}
      <View
        style={[
          styles.topBannerWrap,
          { top: Math.max(insets.top, 14) + 8 },
        ]}
      >
        <GlassSurface radius={RADII.pill} contentStyle={styles.topBannerInner}>
          <View style={styles.bannerLeft}>
            <Text
              numberOfLines={1}
              style={[styles.bannerTitle, { color: colors.textPrimary }]}
            >
              {bannerHeadline}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.bannerSub, { color: colors.textSecondary }]}
            >
              {driver.vehicleModel} {driver.vehicleColor} • {driver.plateNumber}
            </Text>
          </View>
          <View
            style={[
              styles.etaBadge,
              SQUIRCLE,
              { backgroundColor: colors.brandGold },
            ]}
          >
            <Text
              style={[
                styles.etaBadgeText,
                TABULAR_NUMS,
                { color: colors.textOnGold },
              ]}
            >
              {driverEtaMin} min
            </Text>
          </View>
        </GlassSurface>
      </View>

      {/* Bottom Liquid Glass Driver & Trip Sheet */}
      <View
        style={[
          styles.sheetWrap,
          { paddingBottom: Math.max(insets.bottom, 14) + 10 },
        ]}
      >
        <GlassSurface
          heavy
          radius={RADII.sheet}
          intensity={76}
          contentStyle={styles.sheetContent}
        >
          {/* Driver Profile Row */}
          <View style={styles.driverRow}>
            <View style={styles.driverLeft}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.obsidian,
                    borderColor: colors.brandGold,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: colors.brandGold }]}>
                  {driver.initials}
                </Text>
              </View>
              <View style={styles.driverMeta}>
                <Text style={[styles.driverName, { color: colors.textPrimary }]}>
                  {driver.name}
                </Text>
                <Text
                  style={[
                    styles.driverStats,
                    TABULAR_NUMS,
                    { color: colors.textSecondary },
                  ]}
                >
                  {driver.rating.toFixed(1)} ★ •{' '}
                  {driver.tripsCompleted.toLocaleString()} trips • Verified
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.plateBox,
                SQUIRCLE,
                { backgroundColor: colors.pill },
              ]}
            >
              <Text
                style={[
                  styles.plateNum,
                  TABULAR_NUMS,
                  { color: colors.textPrimary },
                ]}
              >
                {driver.plateNumber}
              </Text>
              <Text style={[styles.plateModel, { color: colors.textSecondary }]}>
                {driver.vehicleModel}
              </Text>
            </View>
          </View>

          {/* 4 Quick Action Circles (44x44pt+) */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                Alert.alert(
                  `Call ${driver.name}`,
                  `Dialing ${driver.phone} via masked Ryde VoIP…`
                );
              }}
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Call driver"
            >
              <View
                style={[
                  styles.actionCircle,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                Call
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setChatOpen(true);
              }}
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Message driver"
            >
              <View
                style={[
                  styles.actionCircle,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={colors.textPrimary}
                />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                Message
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShareTrip}
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Share live trip status"
            >
              <View
                style={[
                  styles.actionCircle,
                  {
                    backgroundColor: colors.elevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={colors.textPrimary}
                />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                Share Trip
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning
                ).catch(() => {});
                setSosOpen(true);
              }}
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Safety SOS"
            >
              <View
                style={[
                  styles.actionCircle,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderColor: 'rgba(220, 38, 38, 0.25)',
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.danger}
                />
              </View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>
                Safety SOS
              </Text>
            </Pressable>
          </View>

          {/* Route Summary Box */}
          <View
            style={[
              styles.routeBox,
              SQUIRCLE,
              { backgroundColor: colors.pill },
            ]}
          >
            <View style={styles.routeLineRow}>
              <View
                style={[styles.dotSmall, { backgroundColor: colors.success }]}
              />
              <Text
                numberOfLines={1}
                style={[styles.routeText, { color: colors.textPrimary }]}
              >
                {pickup.name}
              </Text>
            </View>
            <View style={styles.routeLineRow}>
              <View
                style={[styles.dotSmall, { backgroundColor: colors.danger }]}
              />
              <Text
                numberOfLines={1}
                style={[styles.routeTextBold, { color: colors.textPrimary }]}
              >
                {destination.name}
              </Text>
              <Text
                style={[
                  styles.routeFare,
                  TABULAR_NUMS,
                  { color: colors.textPrimary },
                ]}
              >
                {formatPeso(fare.totalFare)} ({payment.label})
              </Text>
            </View>
          </View>

          <PrimaryButton
            label={
              tripStatus === 'accepted' || tripStatus === 'arrived'
                ? 'Driver Picked Me Up — Start Trip'
                : 'Arrive & View Receipt'
            }
            onPress={handleAdvance}
          />
        </GlassSurface>
      </View>

      {/* In-App Driver Chat Modal */}
      <Modal
        visible={chatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setChatOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setChatOpen(false)}
          />
          <View
            style={[
              styles.modalAnchor,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
          >
            <GlassSurface heavy radius={RADII.sheet} contentStyle={styles.chatBox}>
              <View style={styles.chatHeader}>
                <Text style={[styles.chatTitle, { color: colors.textPrimary }]}>
                  Chat with {driver.name}
                </Text>
                <Pressable onPress={() => setChatOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.chatScroll}
                contentContainerStyle={styles.chatList}
              >
                {chatMessages.map((m) => {
                  const isRider = m.sender === 'rider';
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.bubble,
                        SQUIRCLE,
                        isRider
                          ? {
                              alignSelf: 'flex-end',
                              backgroundColor: colors.brandGold,
                            }
                          : {
                              alignSelf: 'flex-start',
                              backgroundColor: colors.elevated,
                            },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          {
                            color: isRider
                              ? colors.textOnGold
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.chatInputRow}>
                <TextInput
                  value={draftMsg}
                  onChangeText={setDraftMsg}
                  placeholder="I’m wearing a yellow jacket…"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.chatInput,
                    SQUIRCLE,
                    {
                      backgroundColor: colors.pill,
                      color: colors.textPrimary,
                    },
                  ]}
                  onSubmitEditing={handleSendChat}
                />
                <Pressable
                  onPress={handleSendChat}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: colors.brandGold },
                  ]}
                >
                  <Ionicons name="send" size={18} color={colors.textOnGold} />
                </Pressable>
              </View>
            </GlassSurface>
          </View>
        </View>
      </Modal>

      {/* Safety SOS Modal */}
      <Modal
        visible={sosOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSosOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSosOpen(false)}
          />
          <View
            style={[
              styles.modalAnchor,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
          >
            <GlassSurface heavy radius={RADII.sheet} contentStyle={styles.sosBox}>
              <Text style={[styles.sosTitle, { color: colors.danger }]}>
                Ryde. Safety Center
              </Text>
              <Text style={[styles.sosDesc, { color: colors.textSecondary }]}>
                Share your live GPS coordinates & vehicle plate ({driver.plateNumber})
                with your trusted contacts or local emergency dispatch.
              </Text>

              {emergencyContacts.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setSosOpen(false);
                    Alert.alert(
                      'Live Location Shared',
                      `Sent your live ride tracking link to ${c.name} (${c.phone}).`
                    );
                  }}
                  style={[
                    styles.contactRow,
                    SQUIRCLE,
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <View>
                    <Text
                      style={[styles.contactName, { color: colors.textPrimary }]}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={[
                        styles.contactMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {c.relation} • {c.phone}
                    </Text>
                  </View>
                  <Ionicons
                    name="paper-plane-outline"
                    size={18}
                    color={colors.danger}
                  />
                </Pressable>
              ))}

              <PrimaryButton
                label="Close Safety Center"
                variant="ghost"
                onPress={() => setSosOpen(false)}
              />
            </GlassSurface>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBannerWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 20,
  },
  topBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 12,
    paddingVertical: 11,
    gap: 12,
  },
  bannerLeft: {
    flex: 1,
    gap: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bannerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  etaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  etaBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 16,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  driverMeta: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
  },
  driverStats: {
    fontSize: 12,
    fontWeight: '500',
  },
  plateBox: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
  },
  plateNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  plateModel: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 68,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    gap: 8,
  },
  routeLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeText: {
    fontSize: 13,
    flex: 1,
  },
  routeTextBold: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  routeFare: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 18, 26, 0.48)',
  },
  modalAnchor: {
    paddingHorizontal: 10,
  },
  chatBox: {
    padding: 18,
    gap: 14,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chatScroll: {
    maxHeight: 220,
  },
  chatList: {
    gap: 10,
    paddingVertical: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBox: {
    padding: 20,
    gap: 14,
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sosDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
