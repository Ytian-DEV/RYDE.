import * as Location from 'expo-location';
import { MAP_API_KEY, MAP_PROVIDER } from '@/config/mapConfig';
import { LatLng, PlaceLocation, RouteGeometry } from '@/types';

/** Default center: Visayas State University / Baybay City, Leyte, Philippines */
export const DEFAULT_CENTER: LatLng = {
  lat: 10.7445,
  lng: 124.7945,
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return Number((2 * R * Math.asin(Math.sqrt(h))).toFixed(2));
}

/**
 * Request foreground GPS permission and read current coordinates + reverse-geocoded place.
 */
export async function getCurrentGpsLocation(): Promise<PlaceLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords: LatLng = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };

    const place = await reverseGeocodeOSM(coords.lat, coords.lng);
    return place;
  } catch {
    return null;
  }
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
    state?: string;
    amenity?: string;
  };
}

/**
 * Place search biased around current location (Philippines).
 * Automatically upgrades to MapTiler Geocoding API when `EXPO_PUBLIC_MAP_API_KEY`
 * is configured, falling back to free OpenStreetMap Nominatim.
 */
export async function searchPlacesOSM(
  query: string,
  near: LatLng = DEFAULT_CENTER
): Promise<PlaceLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Upgrade to commercial MapTiler Geocoding when API key is configured
  if (MAP_API_KEY && MAP_PROVIDER === 'maptiler') {
    try {
      const url =
        `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmed)}.json` +
        `?key=${encodeURIComponent(MAP_API_KEY)}&country=ph&proximity=${near.lng},${near.lat}&limit=7`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          features?: Array<{
            id: string;
            text?: string;
            place_name?: string;
            center?: [number, number];
          }>;
        };
        if (json.features?.length) {
          return json.features
            .filter((f) => Array.isArray(f.center) && f.center.length === 2)
            .map((f) => {
              const lng = f.center![0];
              const lat = f.center![1];
              const dist = haversineKm(near, { lat, lng });
              return {
                id: `mt-${f.id}`,
                name: f.text || f.place_name?.split(',')[0] || 'Selected Place',
                address: f.place_name || '',
                lat,
                lng,
                distanceKm: Math.max(0.2, Number(dist.toFixed(1))),
                etaMinutes: Math.max(2, Math.round(dist * 2.4)),
                category: 'landmark',
              };
            });
        }
      }
    } catch {
      // Fall through to Nominatim
    }
  }

  try {
    const viewbox = `${near.lng - 0.35},${near.lat + 0.35},${near.lng + 0.35},${near.lat - 0.35}`;
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=7&countrycodes=ph` +
      `&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(trimmed)}`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RydeMobileApp/1.0',
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimItem[];

    return data.map((item) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const dist = haversineKm(near, { lat, lng });
      const parts = item.display_name.split(',').map((s) => s.trim());
      const shortName = item.name || parts[0] || 'Selected Place';
      const shortAddr = parts.slice(1, 4).join(', ') || item.display_name;

      return {
        id: `osm-${item.place_id}`,
        name: shortName,
        address: shortAddr,
        lat,
        lng,
        distanceKm: Math.max(0.2, Number(dist.toFixed(1))),
        etaMinutes: Math.max(2, Math.round(dist * 2.4)),
        category: 'landmark',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Free OpenStreetMap Nominatim reverse geocoding when user taps anywhere on the map or uses GPS.
 */
export async function reverseGeocodeOSM(
  lat: number,
  lng: number,
  reference: LatLng = DEFAULT_CENTER
): Promise<PlaceLocation> {
  const dist = haversineKm(reference, { lat, lng });
  const fallback: PlaceLocation = {
    id: `pin-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    name: 'Pinned Location',
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
    distanceKm: Math.max(0.2, Number(dist.toFixed(1))),
    etaMinutes: Math.max(2, Math.round(dist * 2.4)),
    category: 'landmark',
  };

  // Upgrade to commercial MapTiler reverse geocoding when configured
  if (MAP_API_KEY && MAP_PROVIDER === 'maptiler') {
    try {
      const url =
        `https://api.maptiler.com/geocoding/${lng},${lat}.json` +
        `?key=${encodeURIComponent(MAP_API_KEY)}&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as {
          features?: Array<{ text?: string; place_name?: string }>;
        };
        const top = json.features?.[0];
        if (top) {
          return {
            ...fallback,
            name: top.text || top.place_name?.split(',')[0] || fallback.name,
            address: top.place_name || fallback.address,
          };
        }
      }
    } catch {
      // Fall through to Nominatim
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RydeMobileApp/1.0',
      },
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as NominatimItem;
    const parts = (data.display_name || '').split(',').map((s) => s.trim());
    const name =
      data.name ||
      data.address?.amenity ||
      data.address?.road ||
      data.address?.village ||
      parts[0] ||
      'Pinned Location';
    const address = parts.slice(1, 4).join(', ') || fallback.address;

    return {
      ...fallback,
      name,
      address,
    };
  } catch {
    return fallback;
  }
}

/**
 * Free OSRM road-snapped routing engine — returns actual road polyline [lat, lng][],
 * driving distance in km, and ETA in minutes. Falls back smoothly if offline.
 */
export async function fetchRoadRouteOSRM(
  from: LatLng,
  to: LatLng
): Promise<RouteGeometry> {
  const straightKm = Math.max(0.4, haversineKm(from, to));
  const fallback: RouteGeometry = {
    coords: [
      [from.lat, from.lng],
      [(from.lat + to.lat) / 2 + 0.0012, (from.lng + to.lng) / 2 - 0.0012],
      [to.lat, to.lng],
    ],
    distanceKm: Number((straightKm * 1.25).toFixed(1)),
    durationMin: Math.max(3, Math.round(straightKm * 3.1)),
  };

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return fallback;

    const json = (await res.json()) as {
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: Array<[number, number]> };
      }>;
    };

    const route = json.routes?.[0];
    if (!route || !route.geometry?.coordinates?.length) return fallback;

    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: Math.max(0.3, Number((route.distance / 1000).toFixed(1))),
      durationMin: Math.max(2, Math.round(route.duration / 60)),
    };
  } catch {
    return fallback;
  }
}
