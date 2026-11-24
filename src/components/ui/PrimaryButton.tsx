import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RADII, SQUIRCLE, TABULAR_NUMS } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface PrimaryButtonProps {
  label: string;
  loadingLabel?: string;
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
  loadingLabel,
  onPress,
  variant = 'gold',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useAppTheme();
  const scale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: pressOpacity.value,
  }));

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.968, { damping: 18, stiffness: 360 });
    pressOpacity.value = withTiming(0.9, { duration: 90 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 320 });
    pressOpacity.value = withTiming(1, { duration: 140 });
  };

  const handlePress = () => {
    if (isDisabled) return;
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
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        SQUIRCLE,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: disabled && !loading ? 0.52 : 1,
          shadowColor: variant === 'gold' ? colors.brandGoldDeep : colors.shadowColor,
          shadowOpacity: variant === 'gold' ? (isDark ? 0.28 : 0.34) : 0.08,
        },
        animatedStyle,
        style ?? null,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={textColor} />
          {loadingLabel ? (
            <Text style={[styles.label, TABULAR_NUMS, { color: textColor }]}>
              {loadingLabel}
            </Text>
          ) : null}
        </View>
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
    minHeight: 54,
    borderRadius: RADII.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
