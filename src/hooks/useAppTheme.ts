import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS, RydeColorPalette } from '@/constants/theme';
import { useRydeStore } from '@/store/useRydeStore';

export function useAppTheme(): {
  colors: RydeColorPalette;
  isDark: boolean;
} {
  const systemScheme = useColorScheme();
  const themeMode = useRydeStore((s) => s.themeMode);

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  return {
    colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    isDark,
  };
}
