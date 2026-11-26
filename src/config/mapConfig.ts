export type MapProvider = 'openfreemap' | 'maptiler' | 'geoapify' | 'stadia' | 'custom';

const rawStyleUrl = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() ?? '';
const rawStyleUrlDark = process.env.EXPO_PUBLIC_MAP_STYLE_URL_DARK?.trim() ?? '';
const rawApiKey = process.env.EXPO_PUBLIC_MAP_API_KEY?.trim() ?? '';
const rawProvider = (process.env.EXPO_PUBLIC_MAP_PROVIDER?.trim().toLowerCase() ?? '') as
  | MapProvider
  | '';

function isPlaceholderKey(val: string): boolean {
  return (
    val.length === 0 ||
    val.includes('YOUR_') ||
    val.includes('PLACEHOLDER')
  );
}

export const MAP_API_KEY = isPlaceholderKey(rawApiKey) ? '' : rawApiKey;

export const MAP_PROVIDER: MapProvider = (() => {
  if (rawStyleUrl && !isPlaceholderKey(rawStyleUrl)) return 'custom';
  if (
    rawProvider === 'maptiler' ||
    rawProvider === 'geoapify' ||
    rawProvider === 'stadia' ||
    rawProvider === 'openfreemap'
  ) {
    return rawProvider;
  }
  return MAP_API_KEY ? 'maptiler' : 'openfreemap';
})();

/**
 * Returns a MapLibre Style JSON URL for Light or Dark mode.
 *
 * Defaults to OpenFreeMap vector styles (no API key required) out of the box,
 * and upgrades automatically when `EXPO_PUBLIC_MAP_API_KEY` or
 * `EXPO_PUBLIC_MAP_STYLE_URL` is configured in `.env`.
 */
export function getMapLibreStyleUrl(isDark: boolean): string {
  if (rawStyleUrl && !isPlaceholderKey(rawStyleUrl)) {
    if (isDark && rawStyleUrlDark && !isPlaceholderKey(rawStyleUrlDark)) {
      return rawStyleUrlDark;
    }
    return rawStyleUrl;
  }

  if (MAP_API_KEY) {
    switch (MAP_PROVIDER) {
      case 'maptiler':
        return isDark
          ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${encodeURIComponent(MAP_API_KEY)}`
          : `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(MAP_API_KEY)}`;
      case 'geoapify':
        return isDark
          ? `https://maps.geoapify.com/v1/styles/dark-matter/style.json?apiKey=${encodeURIComponent(MAP_API_KEY)}`
          : `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${encodeURIComponent(MAP_API_KEY)}`;
      case 'stadia':
        return isDark
          ? `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${encodeURIComponent(MAP_API_KEY)}`
          : `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${encodeURIComponent(MAP_API_KEY)}`;
      default:
        break;
    }
  }

  // Working free MapLibre vector styles (no API key required)
  return isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';
}

/**
 * Embedded MapLibre Raster Style specification used as an automatic safety
 * fallback if the vector style endpoint is unreachable or blocked.
 */
export function getFallbackRasterStyle(isDark: boolean): Record<string, unknown> {
  const tiles = isDark
    ? [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ]
    : [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ];

  return {
    version: 8,
    sources: {
      'ryde-raster-fallback': {
        type: 'raster',
        tiles,
        tileSize: 256,
        attribution: '© OpenStreetMap © CARTO',
      },
    },
    layers: [
      {
        id: 'ryde-raster-layer',
        type: 'raster',
        source: 'ryde-raster-fallback',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}
