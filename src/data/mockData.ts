import { haversineKm } from '@/services/geoService';
import {
  PaymentMethod,
  PlaceLocation,
  RideTier,
  ServiceItem,
} from '@/types';

/**
 * Public Baybay City & Visayas State University (VSU) map landmarks for search suggestions.
 * Contains no user-specific or personal seed data.
 */
export const BAYBAY_PLACES: PlaceLocation[] = [
  {
    id: 'loc-utod',
    name: '7/11 Utod, 6521',
    address: 'National Highway, Guadalupe, Baybay City',
    distanceKm: 0.4,
    etaMinutes: 2,
    category: 'store',
    lat: 10.7285,
    lng: 124.7986,
  },
  {
    id: 'loc-dcst',
    name: 'DCST, Visayas State University',
    address: 'Visca, Baybay City, Leyte 6521',
    distanceKm: 3.4,
    etaMinutes: 8,
    category: 'campus',
    lat: 10.7468,
    lng: 124.7948,
  },
  {
    id: 'loc-vsu-hosp',
    name: 'VSU Hospital Main Gate',
    address: 'Main Campus Road, Visca, Baybay',
    distanceKm: 2.8,
    etaMinutes: 6,
    category: 'landmark',
    lat: 10.7432,
    lng: 124.7912,
  },
  {
    id: 'loc-stomach-inn',
    name: 'Stomach Inn & Cafe',
    address: 'Highway Front, Upper Guadalupe, Baybay',
    distanceKm: 1.9,
    etaMinutes: 5,
    category: 'store',
    lat: 10.7391,
    lng: 124.7964,
  },
  {
    id: 'loc-market',
    name: 'Baybay City Public Market',
    address: 'R. Magsaysay Ave, Poblacion, Baybay',
    distanceKm: 6.2,
    etaMinutes: 14,
    category: 'landmark',
    lat: 10.6788,
    lng: 124.8012,
  },
  {
    id: 'loc-baywalk',
    name: 'Baybay Baywalk Boulevard',
    address: 'R. Magsaysay Blvd, Poblacion, Baybay',
    distanceKm: 5.8,
    etaMinutes: 12,
    category: 'landmark',
    lat: 10.6772,
    lng: 124.7988,
  },
];

export const SERVICE_ITEMS: ServiceItem[] = [
  {
    id: 'motor',
    label: 'Motor',
    startingFare: 10,
    subtitle: 'starts ₱10',
    icon: 'bicycle',
  },
  {
    id: 'taxi',
    label: 'Taxi',
    startingFare: 40,
    subtitle: 'starts ₱40',
    icon: 'car',
  },
  {
    id: 'food',
    label: 'Food',
    startingFare: 15,
    subtitle: 'starts ₱15',
    icon: 'fast-food',
  },
  {
    id: 'services',
    label: 'Services',
    startingFare: 100,
    subtitle: 'starts ₱100',
    icon: 'cube',
  },
];

export const RIDE_TIERS: RideTier[] = [
  {
    id: 'motor',
    name: 'Ryde Motor',
    tagline: 'Fastest • 1 seat • Helmet included',
    seats: 1,
    etaMinutes: 2,
    baseFare: 22,
    perKmRate: 6,
    icon: 'bicycle',
    badge: 'Fastest',
  },
  {
    id: 'economy',
    name: 'Ryde Economy',
    tagline: 'Best value • 4 seats • A/C sedan',
    seats: 4,
    etaMinutes: 4,
    baseFare: 40,
    perKmRate: 7.06,
    icon: 'car',
    badge: 'Popular',
  },
  {
    id: 'comfort',
    name: 'Ryde Comfort',
    tagline: 'Newer sedans • Top-rated drivers',
    seats: 4,
    etaMinutes: 5,
    baseFare: 64,
    perKmRate: 10,
    icon: 'car-sport',
  },
  {
    id: 'xl',
    name: 'Ryde XL',
    tagline: '6-seater MPV • Extra luggage room',
    seats: 6,
    etaMinutes: 7,
    baseFare: 90,
    perKmRate: 13.24,
    icon: 'bus',
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'gcash',
    label: 'GCash',
    subtitle: 'Instant e-wallet • Reference tracked',
    shortLabel: 'GCash',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'cash',
    label: 'Cash',
    subtitle: 'Pay driver directly upon arrival',
    shortLabel: 'Cash',
    icon: 'cash-outline',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    subtitle: 'BPI / BDO InstaPay QR',
    shortLabel: 'InstaPay QR',
    icon: 'business-outline',
  },
  {
    id: 'apple_pay',
    label: 'Ryde Wallet / Card',
    subtitle: 'Pay from your Ryde Wallet balance',
    shortLabel: 'Ryde Wallet',
    icon: 'card-outline',
  },
];

export function calculateTierFare(
  tier: RideTier,
  pickup: PlaceLocation,
  destination: PlaceLocation,
  promoDiscount = 0,
  overrideDistanceKm?: number
): { baseFare: number; distanceFare: number; distanceKm: number; totalFare: number } {
  const realKm =
    typeof overrideDistanceKm === 'number' && overrideDistanceKm > 0
      ? overrideDistanceKm
      : Math.max(
          0.8,
          Number(
            (
              haversineKm(
                { lat: pickup.lat, lng: pickup.lng },
                { lat: destination.lat, lng: destination.lng }
              ) * 1.25
            ).toFixed(1)
          )
        );
  const distanceFare = Math.round(realKm * tier.perKmRate);
  const rawTotal = tier.baseFare + distanceFare;
  const totalFare = Math.max(tier.baseFare, rawTotal - promoDiscount);
  return {
    baseFare: tier.baseFare,
    distanceFare,
    distanceKm: realKm,
    totalFare,
  };
}
