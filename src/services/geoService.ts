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

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string | undefined>;
}

function inferPlaceCategory(tags: Record<string, string | undefined>): PlaceLocation['category'] {
  const amenity = (tags.amenity || '').toLowerCase();
  const building = (tags.building || '').toLowerCase();
  if (
    amenity.includes('school') ||
    amenity.includes('university') ||
    amenity.includes('college') ||
    building.includes('university') ||
    building.includes('school')
  ) {
    return 'campus';
  }
  if (
    tags.shop ||
    amenity.includes('cafe') ||
    amenity.includes('restaurant') ||
    amenity.includes('fast_food') ||
    amenity.includes('marketplace') ||
    amenity.includes('pharmacy') ||
    amenity.includes('fuel')
  ) {
    return 'store';
  }
  return 'landmark';
}

function formatOverpassSubtitle(tags: Record<string, string | undefined>): string {
  const parts: string[] = [];
  const street = tags['addr:street'] || tags['addr:place'] || tags['addr:suburb'];
  const city = tags['addr:city'] || tags['addr:municipality'] || tags['addr:town'];
  const kind =
    tags.amenity ||
    tags.shop ||
    tags.tourism ||
    tags.building ||
    tags.highway;
  if (kind && kind !== 'yes') {
    parts.push(kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  }
  if (street) parts.push(street);
  if (city) parts.push(city);
  return parts.join(' • ') || 'Nearby landmark';
}

/**
 * Dynamically queries real nearby places, POIs, campuses, shops, and landmarks
 * around the user's current coordinates (`center`) sorted by distance.
 */
export async function fetchNearbyPlaces(
  center: LatLng = DEFAULT_CENTER
): Promise<PlaceLocation[]> {
  const results: PlaceLocation[] = [];
  const seen = new Set<string>();

  const pushUnique = (place: PlaceLocation) => {
    const key = place.name.trim().toLowerCase();
    if (!key || key === 'pinned location' || seen.has(key)) return;
    seen.add(key);
    results.push(place);
  };

  // 1. Live OpenStreetMap Overpass API query for named POIs within 3.5 km of user
  try {
    const query = `[out:json][timeout:8];(node(around:3500,${center.lat},${center.lng})["name"]["amenity"];node(around:3500,${center.lat},${center.lng})["name"]["shop"];node(around:3500,${center.lat},${center.lng})["name"]["tourism"];way(around:3500,${center.lat},${center.lng})["name"]["amenity"];way(around:3500,${center.lat},${center.lng})["name"]["shop"];way(around:3500,${center.lat},${center.lng})["name"]["building"];);out center 25;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (res.ok) {
      const json = (await res.json()) as { elements?: OverpassElement[] };
      for (const el of json.elements ?? []) {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const name = el.tags?.name?.trim();
        if (typeof lat !== 'number' || typeof lng !== 'number' || !name) {
          continue;
        }
        const dist = haversineKm(center, { lat, lng });
        if (dist < 0.03) continue;
        pushUnique({
          id: `poi-${el.id}`,
          name,
          address: formatOverpassSubtitle(el.tags ?? {}),
          lat,
          lng,
          distanceKm: Math.max(0.1, Number(dist.toFixed(1))),
          etaMinutes: Math.max(2, Math.round(dist * 2.4)),
          category: inferPlaceCategory(el.tags ?? {}),
        });
      }
    }
  } catch {
    // Continue to Nominatim / MapTiler supplementary queries
  }

  // 2. Supplement with MapTiler proximity search if configured and results are sparse
  if (results.length < 6 && MAP_API_KEY && MAP_PROVIDER === 'maptiler') {
    try {
      const url =
        `https://api.maptiler.com/geocoding/${center.lng},${center.lat}.json` +
        `?key=${encodeURIComponent(MAP_API_KEY)}&limit=8`;
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
        for (const f of json.features ?? []) {
          if (!Array.isArray(f.center) || f.center.length < 2) continue;
          const lng = f.center[0];
          const lat = f.center[1];
          const dist = haversineKm(center, { lat, lng });
          pushUnique({
            id: `mt-near-${f.id}`,
            name: f.text || f.place_name?.split(',')[0] || 'Nearby Place',
            address: f.place_name || 'Nearby location',
            lat,
            lng,
            distanceKm: Math.max(0.1, Number(dist.toFixed(1))),
            etaMinutes: Math.max(2, Math.round(dist * 2.4)),
            category: 'landmark',
          });
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. Supplement with proximity-bounded Nominatim query around the user's coordinates
  if (results.length < 6) {
    const viewbox = `${center.lng - 0.035},${center.lat + 0.035},${center.lng + 0.035},${center.lat - 0.035}`;
    const categories = ['school', 'market', 'hospital', 'cafe', 'store'];
    for (const term of categories) {
      if (results.length >= 8) break;
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&bounded=1` +
          `&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(term)}`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'RydeMobileApp/1.0',
          },
        });
        if (!res.ok) continue;
        const items = (await res.json()) as NominatimItem[];
        for (const item of items) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const dist = haversineKm(center, { lat, lng });
          const parts = item.display_name.split(',').map((s) => s.trim());
          const shortName = item.name || parts[0] || '';
          const shortAddr = parts.slice(1, 4).join(', ') || item.display_name;
          pushUnique({
            id: `osm-near-${item.place_id}`,
            name: shortName,
            address: shortAddr,
            lat,
            lng,
            distanceKm: Math.max(0.1, Number(dist.toFixed(1))),
            etaMinutes: Math.max(2, Math.round(dist * 2.4)),
            category:
              term === 'school'
                ? 'campus'
                : term === 'cafe' || term === 'store' || term === 'market'
                  ? 'store'
                  : 'landmark',
          });
        }
      } catch {
        // Ignore single category failure
      }
    }
  }

  return results
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 12);
}
