import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { RADII, SQUIRCLE } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

const TAB_META: Record<
  string,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  orders: { label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
  favorites: { label: 'Favorites', icon: 'heart-outline', iconActive: 'heart' },
  profile: { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
};

/**
 * iOS 26 Floating Liquid Glass Capsule Tab Bar.
 */
export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <GlassSurface
        radius={RADII.pill}
        intensity={68}
        contentStyle={styles.capsule}
        style={styles.barContainer}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            label: route.name,
            icon: 'ellipse-outline' as const,
            iconActive: 'ellipse' as const,
          };

          const handlePress = () => {
            Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconColor = isFocused
            ? colors.textOnGold
            : colors.textSecondary;

          return (
            <Pressable
              key={route.key}
              onPress={handlePress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={meta.label}
              style={[
                styles.tabItem,
                SQUIRCLE,
                isFocused && {
                  backgroundColor: colors.brandGold,
                },
              ]}
            >
              <Ionicons
                name={isFocused ? meta.iconActive : meta.icon}
                size={20}
                color={iconColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: iconColor,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 50,
  },
  barContainer: {
    width: '100%',
    maxWidth: 420,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    height: 64,
  },
  tabItem: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
});
