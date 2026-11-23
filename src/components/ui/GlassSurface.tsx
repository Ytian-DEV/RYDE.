import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { RADII, SQUIRCLE } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  heavy?: boolean;
  elevated?: boolean;
  borderColor?: string;
}

/**
 * iOS 26 "Liquid Glass" translucent surface with backdrop blur,
 * subtle 1px specular border, and continuous squircle corners.
 */
export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  contentStyle,
  radius = RADII.xl,
  intensity = 55,
  heavy = false,
  elevated = true,
  borderColor,
}) => {
  const { colors, isDark } = useAppTheme();
  const backgroundColor = heavy ? colors.glassHeavy : colors.glass;
  const specularBorder = borderColor ?? colors.borderSpecular;

  return (
    <View
      style={[
        styles.outer,
        SQUIRCLE,
        {
          borderRadius: radius,
          shadowColor: colors.shadowColor,
          shadowOpacity: elevated ? (isDark ? 0.42 : 0.12) : 0,
        },
        elevated && styles.shadow,
        style,
      ]}
    >
      <View
        style={[
          styles.clipper,
          SQUIRCLE,
          {
            borderRadius: radius,
            borderColor: specularBorder,
            backgroundColor: Platform.OS === 'android' ? backgroundColor : 'transparent',
          },
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? intensity : Math.min(intensity, 35)}
          tint={colors.blurTint}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor,
            },
          ]}
        />
        {/* Specular top rim highlight */}
        <View
          pointerEvents="none"
          style={[
            styles.specularHighlight,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.65)',
            },
          ]}
        />
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
  },
  shadow: {
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
  clipper: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
  },
});
