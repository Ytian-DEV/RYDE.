import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { BrandBadge, GlassSurface, PrimaryButton } from '@/components/ui';
import { RADII, SQUIRCLE, TABULAR_NUMS, TYPOGRAPHY } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

function formatPhPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const storedPhone = useRydeStore((s) => s.pendingPhone);
  const setPendingPhone = useRydeStore((s) => s.setPendingPhone);
  const quickDemoSignIn = useRydeStore((s) => s.quickDemoSignIn);

  const [phone, setPhone] = useState(storedPhone);
  const [focused, setFocused] = useState(false);

  const cleanDigits = phone.replace(/\D/g, '');
  const isValid = cleanDigits.length === 10;

  const handleProceed = () => {
    if (!isValid) return;
    setPendingPhone(phone);
    router.push('/(auth)/otp');
  };

  const handleSocialDemo = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    quickDemoSignIn();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 20) + 28,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <BrandBadge size={64} fontSize={20} />

          <View style={styles.headingGroup}>
            <Text style={[TYPOGRAPHY.largeTitle, { color: colors.textPrimary }]}>
              Welcome to Ryde.
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
              Enter your Philippine mobile number to sign in or create your
              account in seconds.
            </Text>
          </View>

          <GlassSurface
            radius={RADII.lg}
            borderColor={focused ? colors.brandGoldDeep : colors.borderSpecular}
            contentStyle={styles.phoneInputRow}
          >
            <View
              style={[
                styles.countryPill,
                SQUIRCLE,
                { backgroundColor: colors.pill },
              ]}
            >
              <Text style={[styles.countryCode, { color: colors.textPrimary }]}>
                PH +63
              </Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={(txt) => setPhone(formatPhPhone(txt))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="917 482 1094"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              maxLength={12}
              style={[
                styles.phoneInput,
                TABULAR_NUMS,
                { color: colors.textPrimary },
              ]}
              accessibilityLabel="Philippine mobile number"
            />
            {phone.length > 0 ? (
              <Pressable
                onPress={() => setPhone('')}
                hitSlop={10}
                accessibilityLabel="Clear phone number"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            ) : null}
          </GlassSurface>

          <View style={styles.dividerRow}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: colors.borderSubtle },
              ]}
            />
            <Text style={[styles.dividerLabel, { color: colors.textTertiary }]}>
              or continue instantly
            </Text>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: colors.borderSubtle },
              ]}
            />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              onPress={handleSocialDemo}
              style={styles.socialFlex}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              <GlassSurface radius={RADII.pill} contentStyle={styles.socialBtn}>
                <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
                <Text style={[styles.socialText, { color: colors.textPrimary }]}>
                  Apple
                </Text>
              </GlassSurface>
            </Pressable>

            <Pressable
              onPress={handleSocialDemo}
              style={styles.socialFlex}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <GlassSurface radius={RADII.pill} contentStyle={styles.socialBtn}>
                <Ionicons name="logo-google" size={17} color={colors.textPrimary} />
                <Text style={[styles.socialText, { color: colors.textPrimary }]}>
                  Google
                </Text>
              </GlassSurface>
            </Pressable>
          </View>
        </View>

        {/* Thumb-zone CTA */}
        <View style={styles.footer}>
          <Text style={[styles.terms, { color: colors.textTertiary }]}>
            By continuing, you accept Ryde.’s Terms of Service and Privacy Policy.
          </Text>
          <PrimaryButton
            label="Continue"
            onPress={handleProceed}
            disabled={!isValid}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: 24,
  },
  headingGroup: {
    gap: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 62,
    gap: 12,
  },
  countryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    height: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialFlex: {
    flex: 1,
  },
  socialBtn: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    gap: 14,
    paddingTop: 24,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
