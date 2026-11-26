import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { RADII, TOUCH_TARGET } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface GlassIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  tint?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  icon,
  onPress,
  size = TOUCH_TARGET,
  iconSize = 20,
  tint,
  accessibilityLabel,
  style,
}) => {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        { opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
        style,
      ]}
    >
      <GlassSurface
        radius={RADII.pill}
        contentStyle={[styles.inner, { width: size, height: size }]}
      >
        <Ionicons
          name={icon}
          size={iconSize}
          color={tint ?? colors.textPrimary}
        />
      </GlassSurface>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
