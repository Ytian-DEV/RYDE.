import React from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps
  extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Scale while pressed (default 0.97) */
  pressedScale?: number;
  /** Haptic flavour fired on press (default selection tick; 'none' to disable) */
  haptic?: 'selection' | 'light' | 'medium' | 'none';
}

/**
 * Spring-physics press feedback + subtle haptic. Drop-in replacement for Pressable.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  children,
  pressedScale = 0.97,
  haptic = 'selection',
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(pressedScale, { damping: 18, stiffness: 380 });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 320 });
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic === 'selection') Haptics.selectionAsync().catch(() => {});
    else if (haptic === 'light')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    else if (haptic === 'medium')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style ?? null, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};
