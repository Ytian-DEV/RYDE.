import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { formatPeso, RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import { BAYBAY_PLACES, RIDE_TIERS } from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';
import { fetchRoadRouteOSRM, getCurrentGpsLocation } from '@/services/geoService';
import { subscribeToRide, subscribeToSearchingRides } from '@/services/rydeApi';
import { useRydeStore } from '@/store/useRydeStore';
import { RideTierId, RouteGeometry } from '@/types';

export default function DriverDashboardScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isLiveBackend = useRydeStore((s) => s.isLiveBackend);
  const driverVehicle = useRydeStore((s) => s.driverVehicle);
  const openRequests = useRydeStore((s) => s.openRequests);
  const driverActiveRide = useRydeStore((s) => s.driverActiveRide);
  const chatMessages = useRydeStore((s) => s.chatMessages);
  const refreshOpenRequests = useRydeStore((s) => s.refreshOpenRequests);
  const saveDriverVehicle = useRydeStore((s) => s.saveDriverVehicle);
  const toggleDriverOnline = useRydeStore((s) => s.toggleDriverOnline);
  const acceptRideAsDriver = useRydeStore((s) => s.acceptRideAsDriver);
  const updateDriverRideStage = useRydeStore((s) => s.updateDriverRideStage);
  const sendChatMessage = useRydeStore((s) => s.sendChatMessage);
  const appendRealtimeMessage = useRydeStore((s) => s.appendRealtimeMessage);

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draftMsg, setDraftMsg] = useState('');
  const [activeRoute, setActiveRoute] = useState<RouteGeometry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Vehicle form state (empty until configured by the driver)
  const [vModel, setVModel] = useState(driverVehicle?.vehicleModel ?? '');
  const [vColor, setVColor] = useState(driverVehicle?.vehicleColor ?? '');
  const [vPlate, setVPlate] = useState(driverVehicle?.plateNumber ?? '');
  const [vTier, setVTier] = useState<RideTierId>(driverVehicle?.tierId ?? 'economy');

  const hasConfiguredVehicle = Boolean(
    driverVehicle?.vehicleModel?.trim() && driverVehicle?.plateNumber?.trim()
  );
  const isOnline = driverVehicle?.isOnline ?? false;

  // Realtime subscription to incoming searching rides
  useEffect(() => {
    refreshOpenRequests().catch(() => {});
    const channel = subscribeToSearchingRides(() => {
      refreshOpenRequests().catch(() => {});
    });
    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshOpenRequests]);

  // Realtime chat & route for active driver ride
  useEffect(() => {
    if (!driverActiveRide) {
      setActiveRoute(null);
      return;
    }
    fetchRoadRouteOSRM(
      { lat: driverActiveRide.pickup.lat, lng: driverActiveRide.pickup.lng },
      {
        lat: driverActiveRide.destination.lat,
        lng: driverActiveRide.destination.lng,
      }
    )
      .then(setActiveRoute)
      .catch(() => {});

    const channel = subscribeToRide(
      driverActiveRide.id,
      () => {},
      (msg) => appendRealtimeMessage(msg)
    );
    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [driverActiveRide, appendRealtimeMessage]);

  const handleToggleOnline = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (val && !hasConfiguredVehicle) {
      setVehicleModalOpen(true);
      return;
    }
    await toggleDriverOnline(val);
  };

  const handleAccept = async (rideId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setBusyId(rideId);
    const ok = await acceptRideAsDriver(rideId);
    setBusyId(null);
    if (!ok) {
      Alert.alert(
        'Ride Unavailable',
        'Another driver accepted this request or the rider cancelled it.'
      );
    }
  };

  const handleNextDriverStage = async () => {
    if (!driverActiveRide) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const gps = await getCurrentGpsLocation();
    const coords = gps
      ? { lat: gps.lat, lng: gps.lng }
      : {
          lat: driverActiveRide.destination.lat,
          lng: driverActiveRide.destination.lng,
        };

    if (driverActiveRide.status === 'accepted') {
      await updateDriverRideStage('arrived', {
        lat: driverActiveRide.pickup.lat,
        lng: driverActiveRide.pickup.lng,
      });
    } else if (driverActiveRide.status === 'arrived') {
      await updateDriverRideStage('in_trip', coords);
    } else {
      await updateDriverRideStage('completed', {
        lat: driverActiveRide.destination.lat,
        lng: driverActiveRide.destination.lng,
      });
      Alert.alert(
        'Trip Completed!',
        `Earned ${formatPeso(driverActiveRide.totalFare)} (${driverActiveRide.paymentMethod.toUpperCase()}).`
      );
    }
  };

  const handleSaveVehicle = async () => {
    if (!vModel.trim() || !vPlate.trim()) {
      Alert.alert(
        'Vehicle Details Required',
        'Please enter both your vehicle model and plate number.'
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await saveDriverVehicle({
      vehicleModel: vModel.trim(),
      vehicleColor: vColor.trim(),
      plateNumber: vPlate.trim().toUpperCase(),
      tierId: vTier,
      isOnline,
      currentLat: driverVehicle?.currentLat ?? BAYBAY_PLACES[0]!.lat,
      currentLng: driverVehicle?.currentLng ?? BAYBAY_PLACES[0]!.lng,
    });
    setVehicleModalOpen(false);
  };

  const handleSendChat = async () => {
    if (!draftMsg.trim()) return;
    Haptics.selectionAsync().catch(() => {});
    await sendChatMessage(draftMsg, 'driver');
    setDraftMsg('');
  };

  const nextActionLabel =
    driverActiveRide?.status === 'accepted'
      ? 'Arrived at Pick-up'
      : driverActiveRide?.status === 'arrived'
        ? 'Start Trip to Destination'
        : 'Complete Trip & Collect Fare';

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Live OpenStreetMap Background */}
      <InteractiveMap
        pickup={driverActiveRide?.pickup ?? BAYBAY_PLACES[0]}
        destination={driverActiveRide?.destination ?? null}
        routeCoords={activeRoute?.coords}
        showRoute={!!driverActiveRide}
        driverCoords={
          driverVehicle
            ? { lat: driverVehicle.currentLat, lng: driverVehicle.currentLng }
            : null
        }
        etaPillLabel={
          driverActiveRide
            ? `${driverActiveRide.durationMin} min • ${driverActiveRide.distanceKm.toFixed(1)} km`
            : undefined
        }
      />

      {/* Top Floating Driver Mode Header */}
      <View
        style={[
          styles.topBar,
          { top: Math.max(insets.top, 14) + 8 },
        ]}
      >
        <GlassIconButton
          icon="chevron-back"
          accessibilityLabel="Back to Rider Mode"
          onPress={() => router.back()}
        />

        <GlassSurface radius={RADII.pill} contentStyle={styles.onlinePill}>
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: isOnline ? colors.success : colors.textTertiary },
            ]}
          />
          <Text style={[styles.onlineLabel, { color: colors.textPrimary }]}>
            {isOnline ? 'Driver Online' : 'Driver Offline'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: colors.pill, true: colors.success }}
            thumbColor="#FFFFFF"
          />
        </GlassSurface>

        <GlassIconButton
          icon="settings-outline"
          accessibilityLabel="Vehicle Settings"
          onPress={() => setVehicleModalOpen(true)}
        />
      </View>

      {/* Bottom Liquid Glass Driver Dock */}
      <View
        style={[
          styles.dockWrap,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <GlassSurface
          heavy
          topOnly
          radius={RADII.sheet}
          intensity={80}
          contentStyle={styles.dockContent}
        >
          {/* Vehicle + Earnings Summary Bar */}
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.vehicleTitle, { color: colors.textPrimary }]}>
                {hasConfiguredVehicle
                  ? `${driverVehicle?.vehicleModel} • ${driverVehicle?.plateNumber}`
                  : 'No vehicle configured yet'}
              </Text>
              <Text style={[styles.vehicleSub, { color: colors.textSecondary }]}>
                {hasConfiguredVehicle
                  ? isLiveBackend
                    ? 'Live Dispatch Ready'
                    : 'Local Preview Dispatch'
                  : 'Tap the gear icon above to register your vehicle'}
              </Text>
            </View>
            <View
              style={[
                styles.earningsBadge,
                SQUIRCLE,
                { backgroundColor: colors.brandGoldSoft },
              ]}
            >
              <Text
                style={[
                  styles.earningsVal,
                  TABULAR_NUMS,
                  { color: colors.textPrimary },
                ]}
              >
                {formatPeso(driverVehicle?.totalEarnings ?? 0)}
              </Text>
            </View>
          </View>

          {driverActiveRide ? (
            /* Active Accepted Ride Panel */
            <View style={styles.activeBlock}>
              <View
                style={[
                  styles.activeRouteBox,
                  SQUIRCLE,
                  { backgroundColor: colors.elevated },
                ]}
              >
                <View style={styles.activeHeaderRow}>
                  <Text
                    style={[styles.activeBadgeText, { color: colors.success }]}
                  >
                    {driverActiveRide.status.toUpperCase().replace('_', ' ')}
                  </Text>
                  <Text
                    style={[
                      styles.activeFare,
                      TABULAR_NUMS,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {formatPeso(driverActiveRide.totalFare)} (
                    {driverActiveRide.paymentMethod.toUpperCase()})
                  </Text>
                </View>

                <Text style={[styles.stopLine, { color: colors.textPrimary }]}>
                  Pick-up: {driverActiveRide.pickup.name}
                </Text>
                <Text style={[styles.stopLine, { color: colors.textPrimary }]}>
                  Drop-off: {driverActiveRide.destination.name}
                </Text>
              </View>

              <View style={styles.driverActionRow}>
                <Pressable
                  onPress={() => setChatOpen(true)}
                  style={[
                    styles.chatPill,
                    SQUIRCLE,
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color={colors.textPrimary}
                  />
                  <Text
                    style={[styles.chatPillText, { color: colors.textPrimary }]}
                  >
                    Chat with Rider ({chatMessages.length})
                  </Text>
                </Pressable>
              </View>

              <PrimaryButton
                label={nextActionLabel}
                onPress={handleNextDriverStage}
              />
            </View>
          ) : (
            /* Incoming Ride Requests Queue */
            <View style={styles.queueBlock}>
              <View style={styles.queueHeader}>
                <Text
                  style={[styles.queueTitle, { color: colors.textPrimary }]}
                >
                  Incoming Ride Requests ({openRequests.length})
                </Text>
                <Pressable
                  onPress={() => refreshOpenRequests()}
                  hitSlop={8}
                  accessibilityLabel="Refresh requests"
                >
                  <Ionicons
                    name="refresh"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              {!isOnline ? (
                <Text
                  style={[styles.emptyHint, { color: colors.textSecondary }]}
                >
                  Toggle Driver Online above to broadcast your GPS and accept
                  live passenger requests.
                </Text>
              ) : openRequests.length === 0 ? (
                <Text
                  style={[styles.emptyHint, { color: colors.textSecondary }]}
                >
                  Listening for nearby ride requests… New trips booked by riders
                  will appear here automatically.
                </Text>
              ) : (
                <ScrollView
                  style={styles.requestList}
                  contentContainerStyle={styles.requestItems}
                >
                  {openRequests.map((req) => (
                    <View
                      key={req.id}
                      style={[
                        styles.reqCard,
                        SQUIRCLE,
                        {
                          backgroundColor: colors.elevated,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.reqTop}>
                        <Text
                          style={[
                            styles.reqTier,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {req.tierName} • {req.distanceKm.toFixed(1)} km
                        </Text>
                        <Text
                          style={[
                            styles.reqFare,
                            TABULAR_NUMS,
                            { color: colors.success },
                          ]}
                        >
                          {formatPeso(req.totalFare)}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.reqAddr,
                          { color: colors.textSecondary },
                        ]}
                      >
                        From: {req.pickup.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.reqAddr, { color: colors.textPrimary }]}
                      >
                        To: {req.destination.name}
                      </Text>
                      <PrimaryButton
                        label="Accept Ride"
                        loading={busyId === req.id}
                        onPress={() => handleAccept(req.id)}
                        style={{ height: 46, marginTop: 6 }}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </GlassSurface>
      </View>

      {/* Vehicle Setup Modal */}
      <Modal
        visible={vehicleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVehicleModalOpen(false)}
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Driver Vehicle Details
              </Text>
              <TextInput
                value={vModel}
                onChangeText={setVModel}
                placeholder="Vehicle Model (e.g. Honda Click 160i)"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.modalInput,
                  SQUIRCLE,
                  { backgroundColor: colors.pill, color: colors.textPrimary },
                ]}
              />
              <TextInput
                value={vColor}
                onChangeText={setVColor}
                placeholder="Vehicle Color (e.g. Silver)"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.modalInput,
                  SQUIRCLE,
                  { backgroundColor: colors.pill, color: colors.textPrimary },
                ]}
              />
              <TextInput
                value={vPlate}
                onChangeText={setVPlate}
                placeholder="Plate Number (e.g. ABC 4821)"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                style={[
                  styles.modalInput,
                  SQUIRCLE,
                  { backgroundColor: colors.pill, color: colors.textPrimary },
                ]}
              />

              <View style={styles.tierChipRow}>
                {RIDE_TIERS.map((t) => {
                  const sel = vTier === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setVTier(t.id)}
                      style={[
                        styles.tierChip,
                        SQUIRCLE,
                        {
                          backgroundColor: sel ? colors.brandGold : colors.pill,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: sel ? colors.textOnGold : colors.textPrimary,
                        }}
                      >
                        {t.name.replace('Ryde ', '')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <PrimaryButton label="Save Vehicle" onPress={handleSaveVehicle} />
            </GlassSurface>
          </View>
        </View>
      </Modal>

      {/* Driver <-> Rider Realtime Chat Modal */}
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
              { paddingBottom: Math.max(insets.bottom, 16) + 10 },
            ]}
          >
            <GlassSurface
              heavy
              radius={RADII.sheet}
              contentStyle={styles.modalBox}
            >
              <View style={styles.queueHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Chat with Rider
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
                  const isDriver = m.sender === 'driver';
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.bubble,
                        SQUIRCLE,
                        isDriver
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
                        style={{
                          fontSize: 14,
                          color: isDriver
                            ? colors.textOnGold
                            : colors.textPrimary,
                        }}
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
                  placeholder="I’m right outside the gate…"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.chatInput,
                    SQUIRCLE,
                    { backgroundColor: colors.pill, color: colors.textPrimary },
                  ]}
                  onSubmitEditing={handleSendChat}
                />
                <Pressable
                  onPress={handleSendChat}
                  style={[styles.sendBtn, { backgroundColor: colors.brandGold }]}
                >
                  <Ionicons name="send" size={18} color={colors.textOnGold} />
                </Pressable>
              </View>
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
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 20,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 8,
    height: 44,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  onlineLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dockContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleSub: {
    fontSize: 12,
    marginTop: 1,
  },
  earningsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  earningsVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  activeBlock: {
    gap: 12,
  },
  activeRouteBox: {
    padding: 14,
    borderRadius: 18,
    gap: 6,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  activeFare: {
    fontSize: 15,
    fontWeight: '700',
  },
  stopLine: {
    fontSize: 13,
    fontWeight: '500',
  },
  driverActionRow: {
    flexDirection: 'row',
  },
  chatPill: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  queueBlock: {
    gap: 10,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 8,
  },
  requestList: {
    maxHeight: 240,
  },
  requestItems: {
    gap: 10,
  },
  reqCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  reqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqTier: {
    fontSize: 14,
    fontWeight: '700',
  },
  reqFare: {
    fontSize: 16,
    fontWeight: '800',
  },
  reqAddr: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 18, 26, 0.48)',
  },
  modalAnchor: {
    paddingHorizontal: 10,
  },
  modalBox: {
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  modalInput: {
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  tierChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierChip: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatScroll: {
    maxHeight: 200,
  },
  chatList: {
    gap: 8,
    paddingVertical: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  chatInputRow: {
    flexDirection: 'row',
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
});
