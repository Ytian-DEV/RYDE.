import React, { useEffect, useState } from 'react';
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBadge, GlassSurface, OAuthButton, PrimaryButton } from '@/components/ui';
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
  const isLiveBackend = useRydeStore((s) => s.isLiveBackend);
  const authLoading = useRydeStore((s) => s.authLoading);
  const oauthProviderLoading = useRydeStore((s) => s.oauthProviderLoading);
  const signInWithEmail = useRydeStore((s) => s.signInWithEmail);
  const signUpWithEmail = useRydeStore((s) => s.signUpWithEmail);
  const signInWithOAuth = useRydeStore((s) => s.signInWithOAuth);
  const quickDemoSignIn = useRydeStore((s) => s.quickDemoSignIn);

  const isBusy = authLoading || oauthProviderLoading !== null;

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const errorShakeX = useSharedValue(0);
  useEffect(() => {
    if (!errorMsg) return;
    errorShakeX.value = withSequence(
      withTiming(-7, { duration: 48 }),
      withTiming(7, { duration: 48 }),
      withTiming(-4, { duration: 48 }),
      withTiming(4, { duration: 48 }),
      withTiming(0, { duration: 48 })
    );
  }, [errorMsg, errorShakeX]);

  const errorShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShakeX.value }],
  }));

  const isValidEmail = email.trim().includes('@') && email.trim().includes('.');
  const isValidPassword = password.length >= 6;
  const canSubmit =
    mode === 'signin'
      ? isValidEmail && isValidPassword
      : isValidEmail &&
        isValidPassword &&
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        phone.replace(/\D/g, '').length === 10;

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!canSubmit) {
      setErrorMsg('Please fill in all required fields (password min. 6 chars).');
      return;
    }

    const err =
      mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail({
            email,
            password,
            firstName,
            middleName,
            lastName,
            phone,
          });

    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setErrorMsg(err);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/(tabs)');
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    if (isBusy) return;
    setErrorMsg(null);
    const err = await signInWithOAuth(provider);
    if (err === '__CANCELLED__') {
      return;
    }
    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setErrorMsg(err);
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)');
    }
  };

  const handlePreviewMode = () => {
    Haptics.selectionAsync().catch(() => {});
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
            paddingTop: Math.max(insets.top, 20) + 20,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.brandRow}>
            <BrandBadge size={60} fontSize={19} />
          </View>

          <View style={styles.headingGroup}>
            <Text
              style={[
                TYPOGRAPHY.largeTitle,
                styles.headingText,
                { color: colors.textPrimary },
              ]}
            >
              {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
            </Text>
            <Text
              style={[
                TYPOGRAPHY.body,
                styles.subheadingText,
                { color: colors.textSecondary },
              ]}
            >
              {mode === 'signin'
                ? 'Sign in with your email and password to access your live trips and Ryde Wallet.'
                : 'Sign up with email and your Philippine mobile number to ride or drive with Ryde.'}
            </Text>
          </View>

          {/* Segmented iOS 26 Mode Switcher */}
          <View
            style={[
              styles.segmentTrack,
              SQUIRCLE,
              { backgroundColor: colors.pill },
            ]}
          >
            {(['signin', 'signup'] as const).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  disabled={isBusy}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setMode(m);
                    setErrorMsg(null);
                  }}
                  style={[
                    styles.segmentBtn,
                    SQUIRCLE,
                    active && { backgroundColor: colors.brandGold },
                    isBusy && { opacity: 0.6 },
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
                    {m === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form Fields */}
          <Animated.View
            layout={LinearTransition.springify().damping(20).stiffness(240)}
            style={styles.form}
          >
            {mode === 'signup' ? (
              <Animated.View
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(160)}
                style={styles.nameRow}
              >
                <GlassSurface
                  radius={RADII.lg}
                  borderColor={
                    focusedField === 'first'
                      ? colors.brandGoldDeep
                      : colors.borderSpecular
                  }
                  style={styles.flexHalf}
                  contentStyle={styles.inputBox}
                >
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFocusedField('first')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isBusy}
                    placeholder="First name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    style={[styles.input, { color: colors.textPrimary, opacity: isBusy ? 0.55 : 1 }]}
                  />
                </GlassSurface>

                <GlassSurface
                  radius={RADII.lg}
                  borderColor={
                    focusedField === 'last'
                      ? colors.brandGoldDeep
                      : colors.borderSpecular
                  }
                  style={styles.flexHalf}
                  contentStyle={styles.inputBox}
                >
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setFocusedField('last')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isBusy}
                    placeholder="Last name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    style={[styles.input, { color: colors.textPrimary, opacity: isBusy ? 0.55 : 1 }]}
                  />
                </GlassSurface>
              </Animated.View>
            ) : null}

            {mode === 'signup' ? (
              <Animated.View
                entering={FadeInDown.duration(240).delay(30)}
                exiting={FadeOutUp.duration(160)}
              >
                <GlassSurface
                  radius={RADII.lg}
                  borderColor={
                    focusedField === 'middle'
                      ? colors.brandGoldDeep
                      : colors.borderSpecular
                  }
                  contentStyle={styles.inputBox}
                >
                  <TextInput
                    value={middleName}
                    onChangeText={setMiddleName}
                    onFocus={() => setFocusedField('middle')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isBusy}
                    placeholder="Middle name (optional)"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    style={[styles.input, { color: colors.textPrimary, opacity: isBusy ? 0.55 : 1 }]}
                  />
                </GlassSurface>
              </Animated.View>
            ) : null}

            {mode === 'signup' ? (
              <Animated.View
                entering={FadeInDown.duration(260).delay(55)}
                exiting={FadeOutUp.duration(160)}
              >
                <GlassSurface
                  radius={RADII.lg}
                  borderColor={
                    focusedField === 'phone'
                      ? colors.brandGoldDeep
                      : colors.borderSpecular
                  }
                  contentStyle={styles.phoneInputRow}
                >
                  <View
                    style={[
                      styles.countryPill,
                      SQUIRCLE,
                      { backgroundColor: colors.pill },
                    ]}
                  >
                    <Text
                      style={[styles.countryCode, { color: colors.textPrimary }]}
                    >
                      PH +63
                    </Text>
                  </View>
                  <TextInput
                    value={phone}
                    onChangeText={(txt) => setPhone(formatPhPhone(txt))}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    editable={!isBusy}
                    placeholder="917 482 1094"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    maxLength={12}
                    style={[
                      styles.input,
                      TABULAR_NUMS,
                      { color: colors.textPrimary, opacity: isBusy ? 0.55 : 1 },
                    ]}
                  />
                </GlassSurface>
              </Animated.View>
            ) : null}

            <GlassSurface
              radius={RADII.lg}
              borderColor={
                focusedField === 'email'
                  ? colors.brandGoldDeep
                  : colors.borderSpecular
              }
              contentStyle={styles.iconInputRow}
            >
              <Ionicons
                name="mail-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                editable={!isBusy}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary, opacity: isBusy ? 0.55 : 1 }]}
              />
            </GlassSurface>

            <GlassSurface
              radius={RADII.lg}
              borderColor={
                focusedField === 'password'
                  ? colors.brandGoldDeep
                  : colors.borderSpecular
              }
              contentStyle={styles.iconInputRow}
            >
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                editable={!isBusy}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: colors.textPrimary, opacity: isBusy ? 0.55 : 1 }]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                disabled={isBusy}
                hitSlop={10}
                accessibilityLabel="Toggle password visibility"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.textSecondary}
                />
              </Pressable>
            </GlassSurface>

            {errorMsg ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(150)}
                style={[
                  styles.errorBanner,
                  SQUIRCLE,
                  { backgroundColor: colors.dangerSoft },
                  errorShakeStyle,
                ]}
              >
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {errorMsg}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        </View>

        {/* Thumb-zone CTA & Social OAuth */}
        <Animated.View
          layout={LinearTransition.springify().damping(20).stiffness(240)}
          style={styles.footer}
        >
          <PrimaryButton
            label={mode === 'signin' ? 'Sign In' : 'Create Account'}
            loadingLabel={mode === 'signin' ? 'Signing in…' : 'Creating account…'}
            onPress={handleSubmit}
            loading={authLoading}
            disabled={!canSubmit || isBusy}
          />

          <View style={styles.dividerRow}>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]}
            />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
              {mode === 'signin' ? 'or sign in with' : 'or sign up with'}
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]}
            />
          </View>

          <View style={styles.oauthStack}>
            <OAuthButton
              provider="google"
              label={
                mode === 'signin'
                  ? 'Sign in with Google'
                  : 'Sign up with Google'
              }
              onPress={() => handleOAuth('google')}
              loading={oauthProviderLoading === 'google'}
              disabled={isBusy}
            />
            <OAuthButton
              provider="facebook"
              label={
                mode === 'signin'
                  ? 'Sign in with Facebook'
                  : 'Sign up with Facebook'
              }
              onPress={() => handleOAuth('facebook')}
              loading={oauthProviderLoading === 'facebook'}
              disabled={isBusy}
            />
          </View>

          {!isLiveBackend ? (
            <Pressable
              onPress={handlePreviewMode}
              disabled={isBusy}
              style={styles.guestBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.guestText, { color: colors.textSecondary }]}>
                Continue as Guest
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
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
    gap: 24,
  },
  topSection: {
    gap: 20,
  },
  brandRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingGroup: {
    alignItems: 'center',
    gap: 6,
  },
  headingText: {
    textAlign: 'center',
  },
  subheadingText: {
    textAlign: 'center',
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 18,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  form: {
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexHalf: {
    flex: 1,
  },
  inputBox: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 58,
    gap: 10,
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 58,
    gap: 10,
  },
  countryPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  footer: {
    gap: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  oauthStack: {
    gap: 10,
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  guestText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
