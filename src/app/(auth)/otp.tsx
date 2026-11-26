import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassIconButton, GlassSurface, PrimaryButton } from '@/components/ui';
import { RADII, SQUIRCLE, TABULAR_NUMS, TYPOGRAPHY } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pendingPhone = useRydeStore((s) => s.pendingPhone);

  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(45);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const maskedPhone = (() => {
    const d = pendingPhone.replace(/\D/g, '');
    if (d.length < 4) return 'your phone number';
    return `+63 ${d.slice(0, 3)} ••• •${d.slice(-3)}`;
  })();

  const formattedTimer = `0:${String(secondsLeft).padStart(2, '0')}`;

  const handleVerify = () => {
    if (code.length < OTP_LENGTH) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push('/(auth)/name');
  };

  const handleResend = () => {
    Haptics.selectionAsync().catch(() => {});
    setSecondsLeft(60);
    setCode('482916');
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          backgroundColor: colors.canvas,
          paddingTop: Math.max(insets.top, 16) + 12,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <GlassIconButton
          icon="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        />

        <View style={styles.headerBlock}>
          <Text style={[TYPOGRAPHY.largeTitle, { color: colors.textPrimary }]}>
            Verify your number
          </Text>
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
            Enter the 6-digit code sent via SMS to {maskedPhone}
          </Text>
        </View>

        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={styles.cellsRow}
          accessibilityLabel="OTP code input"
        >
          {Array.from({ length: OTP_LENGTH }).map((_, index) => {
            const char = code[index] ?? '';
            const isActive = index === Math.min(code.length, OTP_LENGTH - 1);
            return (
              <GlassSurface
                key={index}
                radius={20}
                borderColor={
                  isActive ? colors.brandGoldDeep : colors.borderSpecular
                }
                style={styles.cellFlex}
                contentStyle={styles.cellInner}
              >
                <Text
                  style={[
                    styles.cellDigit,
                    TABULAR_NUMS,
                    {
                      color: char
                        ? colors.textPrimary
                        : isActive
                          ? colors.brandGoldDeep
                          : colors.textTertiary,
                    },
                  ]}
                >
                  {char || (isActive ? '|' : '')}
                </Text>
              </GlassSurface>
            );
          })}
        </Pressable>

        {/* Hidden input capturing keyboard typing cleanly */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(txt) => setCode(txt.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={OTP_LENGTH}
          autoFocus
          style={styles.hiddenInput}
        />

        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <>
              <Text style={[styles.resendLabel, { color: colors.textSecondary }]}>
                Request a new code in
              </Text>
              <View
                style={[
                  styles.timerBadge,
                  SQUIRCLE,
                  { backgroundColor: colors.brandGoldSoft },
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    TABULAR_NUMS,
                    { color: colors.textPrimary },
                  ]}
                >
                  {formattedTimer}
                </Text>
              </View>
            </>
          ) : (
            <Pressable onPress={handleResend} hitSlop={8}>
              <Text style={[styles.resendLink, { color: colors.brandGoldDeep }]}>
                Resend verification code
              </Text>
            </Pressable>
          )}
        </View>

        {code.length < OTP_LENGTH ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setCode('482916');
            }}
            style={[
              styles.autofillHint,
              SQUIRCLE,
              { backgroundColor: colors.pill },
            ]}
          >
            <Text style={[styles.autofillText, { color: colors.textSecondary }]}>
              Demo tip: Tap here to autofill SMS code 482916
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Verify & Continue"
          onPress={handleVerify}
          disabled={code.length < OTP_LENGTH}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    gap: 22,
  },
  headerBlock: {
    gap: 8,
    marginTop: 6,
  },
  cellsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cellFlex: {
    flex: 1,
  },
  cellInner: {
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDigit: {
    fontSize: 24,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendLabel: {
    fontSize: 14,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.sm,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  autofillHint: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  autofillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 12,
  },
});
