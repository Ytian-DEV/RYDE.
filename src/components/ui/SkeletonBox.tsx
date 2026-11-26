import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { RADII, SQUIRCLE } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SkeletonBoxProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Smooth Reanimated shimmer placeholder for loading states.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height,
  radius = RADII.md,
  style,
}) => {
  const { isDark } = useAppTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.88, { duration: 760, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 760, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fill = isDark
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(24, 28, 35, 0.08)';

  return (
    <Animated.View
      style={[
        styles.base,
        SQUIRCLE,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: fill,
        },
        animStyle,
        style ?? null,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
