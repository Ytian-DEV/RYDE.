import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import { PAYMENT_METHODS } from '@/data/mockData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';
import { PaymentMethodId, ScheduleOptionId } from '@/types';

interface PaymentScheduleSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SCHEDULE_OPTIONS: { id: ScheduleOptionId; label: string; display: string }[] = [
  { id: 'now', label: 'Now', display: 'Leave Now' },
  { id: '15m', label: 'In 15 min', display: 'In 15 min' },
  { id: '30m', label: 'In 30 min', display: 'In 30 min' },
  { id: 'custom', label: '8:00 AM', display: 'Tomorrow 8:00 AM' },
];

export const PaymentScheduleSheet: React.FC<PaymentScheduleSheetProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const selectedPayment = useRydeStore((s) => s.selectedPayment);
  const setSelectedPayment = useRydeStore((s) => s.setSelectedPayment);
  const scheduleOption = useRydeStore((s) => s.scheduleOption);
  const setScheduleOption = useRydeStore((s) => s.setScheduleOption);

  const bottomPad = useMemo(() => Math.max(insets.bottom, 16) + 8, [insets.bottom]);

  const handleSelectPayment = (id: PaymentMethodId) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedPayment(id);
  };

  const handleSelectSchedule = (opt: (typeof SCHEDULE_OPTIONS)[number]) => {
    Haptics.selectionAsync().catch(() => {});
    setScheduleOption(opt.id, opt.display);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetAnchor, { paddingBottom: bottomPad }]}>
          <GlassSurface
            heavy
            radius={RADII.sheet}
            intensity={75}
            contentStyle={styles.sheetContent}
          >
            <View style={styles.grabberWrap}>
              <View
                style={[
                  styles.grabber,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(24,28,35,0.18)',
                  },
                ]}
              />
            </View>

            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Payment & Pickup Time
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close payment sheet"
                style={[styles.closePill, { backgroundColor: colors.pill }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              PAYMENT METHOD
            </Text>

            <View style={styles.list}>
              {PAYMENT_METHODS.map((pm) => {
                const selected = pm.id === selectedPayment;
                return (
                  <Pressable
                    key={pm.id}
                    onPress={() => handleSelectPayment(pm.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.methodRow,
                      SQUIRCLE,
                      {
                        backgroundColor: selected
                          ? colors.brandGoldSoft
                          : colors.pill,
                        borderColor: selected
                          ? colors.brandGoldDeep
                          : colors.borderSubtle,
                        borderWidth: selected ? 1.5 : 1,
                      },
                    ]}
                  >
                    <View style={styles.methodLeft}>
                      <View
                        style={[
                          styles.methodIconBox,
                          SQUIRCLE,
                          {
                            backgroundColor: selected
                              ? colors.brandGold
                              : colors.elevated,
                          },
                        ]}
                      >
                        <Ionicons
                          name={pm.icon}
                          size={20}
                          color={selected ? colors.textOnGold : colors.textPrimary}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.methodLabel,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {pm.label}
                        </Text>
                        <Text
                          style={[
                            styles.methodSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {pm.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.radio,
                        {
                          backgroundColor: selected
                            ? colors.obsidian
                            : 'transparent',
                          borderColor: selected
                            ? colors.obsidian
                            : colors.textTertiary,
                        },
                      ]}
                    >
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.brandGold}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.sectionLabel,
                { color: colors.textTertiary, marginTop: 16 },
              ]}
            >
              PICKUP TIME
            </Text>

            <View style={styles.scheduleRow}>
              {SCHEDULE_OPTIONS.map((opt) => {
                const active = opt.id === scheduleOption;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleSelectSchedule(opt)}
                    style={[
                      styles.scheduleChip,
                      SQUIRCLE,
                      {
                        backgroundColor: active
                          ? colors.obsidian
                          : colors.pill,
                        borderColor: active
                          ? colors.obsidian
                          : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scheduleText,
                        TABULAR_NUMS,
                        {
                          color: active
                            ? colors.brandGold
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <PrimaryButton
              label="Apply Selection"
              onPress={onClose}
              style={{ marginTop: 20 }}
            />
          </GlassSurface>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 18, 26, 0.42)',
  },
  sheetAnchor: {
    paddingHorizontal: 10,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  grabberWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  list: {
    gap: 10,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    minHeight: 60,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  methodSub: {
    fontSize: 12,
    marginTop: 1,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  scheduleText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
