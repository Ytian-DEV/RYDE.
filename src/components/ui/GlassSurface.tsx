import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { RADII, SQUIRCLE } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  heavy?: boolean;
  elevated?: boolean;
  borderColor?: string;
  /** Set true when GlassSurface is used as a full-size background layer (e.g. BottomSheet backgroundComponent) */
  fill?: boolean;
  /** Round only the top corners (for bottom-docked sheets so no map bleeds around bottom edges) */
  topOnly?: boolean;
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
  intensity = 65,
  heavy = false,
  elevated = true,
  borderColor,
  fill = false,
  topOnly = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const backgroundColor = heavy ? colors.glassHeavy : colors.glass;
  const specularBorder = borderColor ?? colors.borderSpecular;

  const radiusStyle: ViewStyle = topOnly
    ? {
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }
    : { borderRadius: radius };

  const webBlurStyle =
    Platform.OS === 'web'
      ? ({
          backdropFilter: `blur(${heavy ? 32 : 24}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${heavy ? 32 : 24}px) saturate(180%)`,
        } as unknown as ViewStyle)
      : undefined;

  return (
    <View
      style={[
        styles.outer,
        SQUIRCLE,
        radiusStyle,
        style ?? null,
      ]}
    >
      <View
        style={[
          styles.clipper,
          fill ? styles.fillClipper : null,
          SQUIRCLE,
          webBlurStyle ?? null,
          radiusStyle,
          {
            borderColor: specularBorder,
            borderBottomWidth: topOnly ? 0 : 1,
            backgroundColor:
              Platform.OS === 'ios' ? 'transparent' : backgroundColor,
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={intensity}
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor,
            },
          ]}
        />

        {/* Specular top rim highlight for clear separation from map */}
        <View
          pointerEvents="none"
          style={[
            styles.specularHighlight,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(255, 255, 255, 0.85)',
            },
          ]}
        />

        {children ? (
          <View style={[fill && styles.fillContent, contentStyle]}>
            {children}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
  },
  clipper: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  fillClipper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fillContent: {
    flex: 1,
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
  },
});
