import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'gold' | 'obsidian' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  variant = 'gold',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  const bgColor =
    variant === 'gold'
      ? colors.brandGold
      : variant === 'obsidian'
        ? colors.obsidian
        : variant === 'danger'
          ? colors.dangerSoft
          : colors.pill;

  const textColor =
    variant === 'gold'
      ? colors.textOnGold
      : variant === 'obsidian'
        ? colors.brandGold
        : variant === 'danger'
          ? colors.danger
          : colors.textPrimary;

  const borderColor =
    variant === 'gold'
      ? 'rgba(255, 255, 255, 0.55)'
      : variant === 'danger'
        ? 'rgba(220, 38, 38, 0.25)'
        : colors.borderSubtle;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.button,
        SQUIRCLE,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: disabled ? 0.52 : 1,
          shadowColor: variant === 'gold' ? colors.brandGoldDeep : colors.shadowColor,
          shadowOpacity: variant === 'gold' ? (isDark ? 0.28 : 0.34) : 0.08,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, TABULAR_NUMS, { color: textColor }]}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    minHeight: 48,
    borderRadius: RADII.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
