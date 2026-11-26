import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SQUIRCLE } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface BrandBadgeProps {
  size?: number;
  fontSize?: number;
}

export const BrandBadge: React.FC<BrandBadgeProps> = ({
  size = 76,
  fontSize = 24,
}) => {
  const { colors } = useAppTheme();
  const radius = Math.round(size * 0.28);

  return (
    <View
      style={[
        styles.badge,
        SQUIRCLE,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.brandGold,
        },
      ]}
    >
      <Text
        style={[
          styles.wordmark,
          {
            fontSize,
            color: colors.textOnGold,
          },
        ]}
      >
        Ryde.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
  wordmark: {
    fontWeight: '900',
    letterSpacing: -0.8,
  },
});
