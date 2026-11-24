import React, { useState } from 'react';
import {
  Alert,
  Modal,
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
import { PaymentScheduleSheet } from '@/components/sheets/PaymentScheduleSheet';
import { GlassSurface, PrimaryButton } from '@/components/ui';
import {
  formatPeso,
  RADII,
  SQUIRCLE,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';
import { ThemeMode } from '@/types';

const TOP_UP_AMOUNTS = [100, 250, 500, 1000];
const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isLiveBackend = useRydeStore((s) => s.isLiveBackend);
  const user = useRydeStore((s) => s.user);
  const driverVehicle = useRydeStore((s) => s.driverVehicle);
  const themeMode = useRydeStore((s) => s.themeMode);
  const setThemeMode = useRydeStore((s) => s.setThemeMode);
  const walletTransactions = useRydeStore((s) => s.walletTransactions);
  const topUpWallet = useRydeStore((s) => s.topUpWallet);
  const promos = useRydeStore((s) => s.promos);
  const appliedPromo = useRydeStore((s) => s.appliedPromo);
  const applyPromo = useRydeStore((s) => s.applyPromo);
  const emergencyContacts = useRydeStore((s) => s.emergencyContacts);
  const addEmergencyContact = useRydeStore((s) => s.addEmergencyContact);
  const signOut = useRydeStore((s) => s.signOut);

  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpMethod, setTopUpMethod] = useState<'gcash' | 'instapay'>('gcash');
  const [topUpRef, setTopUpRef] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const fullName =
    [user.firstName, user.middleName, user.lastName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ') ||
    user.email ||
    'Ryde Rider';

  const initials =
    `${user.firstName.trim().charAt(0)}${user.lastName.trim().charAt(0) || user.firstName.trim().charAt(1)}`.toUpperCase() ||
    (user.email.trim().charAt(0).toUpperCase() || 'RY');

  const subtitleParts = [
    user.phone || user.email,
    user.totalTrips > 0 && user.rating > 0
      ? `${user.rating.toFixed(2)} ★`
      : 'New rider',
  ].filter(Boolean);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleTopUp = async (amt: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await topUpWallet(amt, topUpMethod, topUpRef.trim() || null);
    setTopUpRef('');
    setTopUpOpen(false);
  };

  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await addEmergencyContact({
      name: newContactName.trim(),
      relation: newContactRelation.trim() || 'Family',
      phone: newContactPhone.trim(),
    });
    setNewContactName('');
    setNewContactRelation('');
    setNewContactPhone('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 108,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[TYPOGRAPHY.largeTitle, { color: colors.textPrimary }]}>
            Profile
          </Text>
          <GlassSurface radius={RADII.pill} contentStyle={styles.liveChip}>
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor: isLiveBackend
                    ? colors.success
                    : colors.brandGoldDeep,
                },
              ]}
            />
            <Text style={[styles.liveText, { color: colors.textSecondary }]}>
              {isLiveBackend ? 'Supabase Live' : 'Preview Mode'}
            </Text>
          </GlassSurface>
        </View>

        {/* User Hero Liquid Glass Card */}
        <GlassSurface radius={RADII.xl} contentStyle={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View
              style={[styles.avatar, { backgroundColor: colors.brandGold }]}
            >
              <Text style={[styles.avatarText, { color: colors.textOnGold }]}>
                {initials}
              </Text>
            </View>
            <View style={styles.heroMeta}>
              <Text
                numberOfLines={1}
                style={[styles.userName, { color: colors.textPrimary }]}
              >
                {fullName}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.userSub,
                  TABULAR_NUMS,
                  { color: colors.textSecondary },
                ]}
              >
                {subtitleParts.join(' • ')}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.tripsPill,
              SQUIRCLE,
              { backgroundColor: colors.pill },
            ]}
          >
            <Text
              style={[
                styles.tripsText,
                TABULAR_NUMS,
                { color: colors.textPrimary },
              ]}
            >
              {user.totalTrips} rides
            </Text>
          </View>
        </GlassSurface>

        {/* Switch to Driver Mode CTA Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/driver');
          }}
          accessibilityRole="button"
        >
          <GlassSurface
            radius={RADII.xl}
            borderColor={colors.brandGoldDeep}
            contentStyle={styles.driverBanner}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  SQUIRCLE,
                  { backgroundColor: colors.brandGold },
                ]}
              >
                <Ionicons name="car-sport" size={20} color={colors.textOnGold} />
              </View>
              <View style={styles.rowTextCol}>
                <Text
                  style={[styles.settingTitle, { color: colors.textPrimary }]}
                >
                  Switch to Driver Mode
                </Text>
                <Text
                  style={[styles.settingSub, { color: colors.textSecondary }]}
                >
                  {driverVehicle?.isOnline
                    ? 'Online now • Accepting live requests'
                    : 'Go online, accept rides & earn via Realtime'}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.brandGoldDeep}
            />
          </GlassSurface>
        </Pressable>

        {/* Ryde Wallet Obsidian Card */}
        <View
          style={[
            styles.walletCard,
            SQUIRCLE,
            { backgroundColor: colors.obsidian },
          ]}
        >
          <View style={styles.walletLeft}>
            <Text style={styles.walletLabel}>RYDE WALLET BALANCE</Text>
            <Text
              style={[
                styles.walletAmount,
                TABULAR_NUMS,
                { color: colors.brandGold },
              ]}
            >
              {formatPeso(user.walletBalance)}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setTopUpOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Top up Ryde Wallet"
            style={[
              styles.topUpBtn,
              SQUIRCLE,
              { backgroundColor: colors.brandGold },
            ]}
          >
            <Text style={[styles.topUpText, { color: colors.textOnGold }]}>
              + Top Up
            </Text>
          </Pressable>
        </View>

        {/* Live iOS 26 Appearance Switcher */}
        <GlassSurface radius={RADII.xl} contentStyle={styles.appearanceCard}>
          <View style={styles.appearanceTop}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.settingIcon,
                  SQUIRCLE,
                  {
                    backgroundColor: isDark
                      ? colors.brandGoldSoft
                      : colors.pill,
                  },
                ]}
              >
                <Ionicons
                  name="contrast-outline"
                  size={18}
                  color={isDark ? colors.brandGold : colors.textPrimary}
                />
              </View>
              <View>
                <Text
                  style={[styles.settingTitle, { color: colors.textPrimary }]}
                >
                  Appearance
                </Text>
                <Text
                  style={[styles.settingSub, { color: colors.textSecondary }]}
                >
                  iOS 26 Liquid Glass Light & Dark Mode
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.segmentTrack,
              SQUIRCLE,
              { backgroundColor: colors.pill },
            ]}
          >
            {THEME_MODES.map((m) => {
              const active = themeMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setThemeMode(m.id);
                  }}
                  style={[
                    styles.segmentPill,
                    SQUIRCLE,
                    active && {
                      backgroundColor: colors.brandGold,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: active
                          ? colors.textOnGold
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>

        {/* Inset Grouped Liquid Glass Settings Rows */}
        <GlassSurface radius={RADII.xl} contentStyle={styles.settingsGroup}>
          {[
            {
              icon: 'wallet-outline' as const,
              title: 'Payment Methods',
              sub: 'GCash, Cash, InstaPay, Ryde Wallet',
              onPress: () => setPaySheetOpen(true),
            },
            {
              icon: 'shield-checkmark-outline' as const,
              title: 'Safety & SOS Contacts',
              sub: `${emergencyContacts.length} trusted contacts`,
              onPress: () => setSosOpen(true),
            },
            {
              icon: 'pricetag-outline' as const,
              title: 'Promo Codes & Vouchers',
              sub: appliedPromo
                ? `Active: ${appliedPromo.code}`
                : `${promos.length} vouchers available`,
              onPress: () => setPromoOpen(true),
            },
            {
              icon: 'help-circle-outline' as const,
              title: 'Help Center & Support',
              sub: '24/7 Baybay & VSU Rider Support',
              onPress: () =>
                Alert.alert(
                  'Ryde. Support',
                  'Our Baybay dispatch team is available 24/7 at support@ryde.ph or hotline (053) 565-RYDE.'
                ),
            },
          ].map((row, index, arr) => (
            <React.Fragment key={row.title}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  row.onPress();
                }}
                style={styles.settingRow}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.settingIcon,
                      SQUIRCLE,
                      {
                        backgroundColor: isDark
                          ? colors.brandGoldSoft
                          : colors.pill,
                      },
                    ]}
                  >
                    <Ionicons
                      name={row.icon}
                      size={18}
                      color={isDark ? colors.brandGold : colors.textPrimary}
                    />
                  </View>
                  <View style={styles.rowTextCol}>
                    <Text
                      style={[
                        styles.settingTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {row.title}
                    </Text>
                    <Text
                      style={[
                        styles.settingSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {row.sub}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.textTertiary}
                />
              </Pressable>
              {index < arr.length - 1 ? (
                <View
                  style={[
                    styles.rowDivider,
                    { backgroundColor: colors.borderSubtle },
                  ]}
                />
              ) : null}
            </React.Fragment>
          ))}
        </GlassSurface>

        <PrimaryButton
          label="Sign Out"
          variant="danger"
          onPress={handleSignOut}
        />
      </ScrollView>

      <PaymentScheduleSheet
        visible={paySheetOpen}
        onClose={() => setPaySheetOpen(false)}
      />

      {/* Top Up + Ledger Modal */}
      <Modal
        visible={topUpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTopUpOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTopUpOpen(false)}
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
                Ryde Wallet Top-Up & Ledger
              </Text>

              <View style={styles.methodRow}>
                {(['gcash', 'instapay'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setTopUpMethod(m)}
                    style={[
                      styles.methodChip,
                      SQUIRCLE,
                      {
                        backgroundColor:
                          topUpMethod === m ? colors.brandGold : colors.pill,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color:
                          topUpMethod === m
                            ? colors.textOnGold
                            : colors.textPrimary,
                      }}
                    >
                      {m === 'gcash' ? 'GCash' : 'InstaPay QR'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={topUpRef}
                onChangeText={setTopUpRef}
                placeholder="Optional GCash / InstaPay Reference #"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.modalInput,
                  SQUIRCLE,
                  { backgroundColor: colors.pill, color: colors.textPrimary },
                ]}
              />

              <View style={styles.amountGrid}>
                {TOP_UP_AMOUNTS.map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => handleTopUp(amt)}
                    style={[
                      styles.amountTile,
                      SQUIRCLE,
                      { backgroundColor: colors.brandGoldSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        TABULAR_NUMS,
                        { color: colors.textPrimary },
                      ]}
                    >
                      +₱{amt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {walletTransactions.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    paddingVertical: 8,
                  }}
                >
                  No wallet transactions yet.
                </Text>
              ) : (
                <View style={styles.ledgerBox}>
                  <Text
                    style={[
                      styles.ledgerHeading,
                      { color: colors.textTertiary },
                    ]}
                  >
                    RECENT WALLET LEDGER
                  </Text>
                  {walletTransactions.slice(0, 3).map((tx) => (
                    <View key={tx.id} style={styles.ledgerRow}>
                      <View style={styles.rowTextCol}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.textPrimary,
                          }}
                        >
                          {tx.description}
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: colors.textSecondary }}
                        >
                          {tx.createdAt}
                          {tx.referenceCode ? ` • Ref: ${tx.referenceCode}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          TABULAR_NUMS,
                          {
                            fontSize: 14,
                            fontWeight: '700',
                            color:
                              tx.amount >= 0 ? colors.success : colors.danger,
                          },
                        ]}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatPeso(tx.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <PrimaryButton
                label="Close"
                variant="ghost"
                onPress={() => setTopUpOpen(false)}
              />
            </GlassSurface>
          </View>
        </View>
      </Modal>

      {/* Promos Modal */}
      <Modal
        visible={promoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPromoOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPromoOpen(false)}
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
                Promo Codes & Vouchers
              </Text>
              {promos.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    paddingVertical: 12,
                  }}
                >
                  No promo vouchers available right now.
                </Text>
              ) : null}
              {promos.map((p) => {
                const active = appliedPromo?.id === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      applyPromo(active ? null : p);
                      setPromoOpen(false);
                    }}
                    style={[
                      styles.promoRow,
                      SQUIRCLE,
                      {
                        backgroundColor: active
                          ? colors.brandGoldSoft
                          : colors.elevated,
                        borderColor: active
                          ? colors.brandGoldDeep
                          : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.rowTextCol}>
                      <Text
                        style={[
                          styles.settingTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {p.code}
                      </Text>
                      <Text
                        style={[
                          styles.settingSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {p.title} • {p.expiry}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: active ? colors.success : colors.brandGoldDeep,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {active ? 'Applied' : 'Use'}
                    </Text>
                  </Pressable>
                );
              })}
              <PrimaryButton
                label="Done"
                variant="ghost"
                onPress={() => setPromoOpen(false)}
              />
            </GlassSurface>
          </View>
        </View>
      </Modal>

      {/* Safety Contacts Modal (Real Supabase CRUD) */}
      <Modal
        visible={sosOpen}
        transparent
        animationType="slide"
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
              { paddingBottom: Math.max(insets.bottom, 16) + 10 },
            ]}
          >
            <GlassSurface
              heavy
              radius={RADII.sheet}
              contentStyle={styles.modalBox}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Trusted Emergency Contacts
              </Text>
              {emergencyContacts.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    paddingVertical: 6,
                  }}
                >
                  No trusted contacts added yet. Add a contact below to share
                  your live trip during emergencies.
                </Text>
              ) : null}
              {emergencyContacts.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.promoRow,
                    SQUIRCLE,
                    {
                      backgroundColor: colors.elevated,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.settingTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={[
                        styles.settingSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {c.relation} • {c.phone}
                    </Text>
                  </View>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={colors.success}
                  />
                </View>
              ))}

              <TextInput
                value={newContactName}
                onChangeText={setNewContactName}
                placeholder="Contact Name"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.modalInput,
                  SQUIRCLE,
                  { backgroundColor: colors.pill, color: colors.textPrimary },
                ]}
              />
              <View style={styles.methodRow}>
                <TextInput
                  value={newContactRelation}
                  onChangeText={setNewContactRelation}
                  placeholder="Relation"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.modalInput,
                    styles.flexOne,
                    SQUIRCLE,
                    { backgroundColor: colors.pill, color: colors.textPrimary },
                  ]}
                />
                <TextInput
                  value={newContactPhone}
                  onChangeText={setNewContactPhone}
                  placeholder="+63 917..."
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  style={[
                    styles.modalInput,
                    styles.flexOne,
                    SQUIRCLE,
                    { backgroundColor: colors.pill, color: colors.textPrimary },
                  ]}
                />
              </View>

              <PrimaryButton
                label="Add Trusted Contact"
                disabled={!newContactName.trim() || !newContactPhone.trim()}
                onPress={handleAddContact}
              />
              <PrimaryButton
                label="Close"
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
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 10,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroMeta: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userSub: {
    fontSize: 13,
  },
  tripsPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tripsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  driverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
  },
  walletLeft: {
    gap: 3,
  },
  walletLabel: {
    color: '#9AA4B2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  topUpBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUpText: {
    fontSize: 13,
    fontWeight: '700',
  },
  appearanceCard: {
    padding: 14,
    gap: 12,
  },
  appearanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsGroup: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 58,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    gap: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 12,
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 12,
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
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  modalInput: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexOne: {
    flex: 1,
  },
  methodChip: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountTile: {
    width: '48%',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  ledgerBox: {
    gap: 8,
    marginTop: 4,
  },
  ledgerHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
});
