import { Platform, TextStyle } from 'react-native';

export interface RydeColorPalette {
  brandGold: string;
  brandGoldDeep: string;
  brandGoldSoft: string;
  canvas: string;
  elevated: string;
  glass: string;
  glassHeavy: string;
  pill: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnGold: string;
  borderSpecular: string;
  borderSubtle: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  obsidian: string;
  shadowColor: string;
  blurTint: 'light' | 'dark';
}

export const LIGHT_COLORS: RydeColorPalette = {
  brandGold: '#DB2777',
  brandGoldDeep: '#BE185D',
  brandGoldSoft: 'rgba(219, 39, 119, 0.14)',
  canvas: '#F6F4F6',
  elevated: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.86)',
  glassHeavy: 'rgba(250, 248, 251, 0.95)',
  pill: 'rgba(24, 28, 35, 0.06)',
  textPrimary: '#181C23',
  textSecondary: '#5E6673',
  textTertiary: '#8C95A3',
  textOnGold: '#FFFFFF',
  borderSpecular: 'rgba(255, 255, 255, 0.85)',
  borderSubtle: 'rgba(24, 28, 35, 0.08)',
  success: '#16A34A',
  successSoft: 'rgba(22, 163, 74, 0.14)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.12)',
  info: '#007AFF',
  infoSoft: 'rgba(0, 122, 255, 0.14)',
  obsidian: '#181C23',
  shadowColor: '#0F172A',
  blurTint: 'light',
};

export const DARK_COLORS: RydeColorPalette = {
  brandGold: '#EC4899',
  brandGoldDeep: '#DB2777',
  brandGoldSoft: 'rgba(236, 72, 153, 0.18)',
  canvas: '#14181F',
  elevated: '#1D232D',
  glass: 'rgba(24, 30, 41, 0.86)',
  glassHeavy: 'rgba(18, 23, 32, 0.94)',
  pill: 'rgba(255, 255, 255, 0.09)',
  textPrimary: '#F8F9FA',
  textSecondary: '#9AA4B2',
  textTertiary: '#6C7685',
  textOnGold: '#FFFFFF',
  borderSpecular: 'rgba(255, 255, 255, 0.16)',
  borderSubtle: 'rgba(255, 255, 255, 0.10)',
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.16)',
  info: '#0A84FF',
  infoSoft: 'rgba(10, 132, 255, 0.18)',
  obsidian: '#0D1016',
  shadowColor: '#000000',
  blurTint: 'dark',
};

export const RADII = {
  sm: 12,
  md: 18,
  lg: 22,
  xl: 26,
  sheet: 32,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const TOUCH_TARGET = 44;

export const TABULAR_NUMS: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export const SQUIRCLE = Platform.select({
  ios: { borderCurve: 'continuous' as const },
  default: {},
});

export const NO_WEB_OUTLINE: TextStyle = Platform.select({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
  default: {},
});

export const TYPOGRAPHY: Record<string, TextStyle> = {
  brand: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  largeTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  subheadline: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  /** Editorial fare / price display — bold, tightly tracked, tabular */
  fareDisplay: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1.1,
    fontVariant: ['tabular-nums'],
  },
  fare: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  /** Quiet, well-spaced uppercase overline label */
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
};

export function formatPeso(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}
