import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { RADII, SQUIRCLE } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export type OAuthProvider = 'google' | 'facebook';

export interface OAuthButtonProps {
  provider: OAuthProvider;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GoogleLogo: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </Svg>
);

const FacebookLogo: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="12" fill="#1877F2" />
    <Path
      fill="#FFFFFF"
      d="M15.72 15.28l.53-3.46h-3.32V9.58c0-.95.46-1.87 1.95-1.87h1.51V4.77S15.02 4.5 13.7 4.5c-2.74 0-4.53 1.66-4.53 4.67v2.65H6.13v3.46h3.04V23.6c.61.1 1.24.15 1.88.15s1.27-.05 1.88-.15v-8.32h2.79z"
    />
  </Svg>
);

export const OAuthButton: React.FC<OAuthButtonProps> = ({
  provider,
  label,
  onPress,
  loading = false,
  disabled = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  };

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const surfaceBg = isDark
    ? 'rgba(30, 35, 45, 0.88)'
    : 'rgba(255, 255, 255, 0.92)';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        SQUIRCLE,
        {
          backgroundColor: surfaceBg,
          borderColor: colors.borderSpecular,
          opacity: disabled && !loading ? 0.52 : 1,
        },
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textPrimary} />
      ) : (
        <View style={styles.iconWrap}>
          {provider === 'google' ? <GoogleLogo /> : <FacebookLogo />}
        </View>
      )}
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {loading ? `Connecting to ${provider === 'google' ? 'Google' : 'Facebook'}…` : label}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: RADII.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingHorizontal: 18,
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
