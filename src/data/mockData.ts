import {
  DriverProfile,
  EmergencyContact,
  PaymentMethod,
  PlaceLocation,
  PromoCode,
  RideTier,
  ServiceItem,
  TripRecord,
} from '@/types';

export const BAYBAY_PLACES: PlaceLocation[] = [
  {
    id: 'loc-utod',
    name: '7/11 Utod, 6521',
    address: 'National Highway, Guadalupe, Baybay City',
    distanceKm: 0.4,
    etaMinutes: 2,
    category: 'store',
    mapX: 0.28,
    mapY: 0.62,
  },
  {
    id: 'loc-dcst',
    name: 'DCST, Visayas State University',
    address: 'Visca, Baybay City, Leyte 6521',
    distanceKm: 3.4,
    etaMinutes: 8,
    category: 'campus',
    mapX: 0.68,
    mapY: 0.28,
  },
  {
    id: 'loc-vsu-hosp',
    name: 'VSU Hospital Main Gate',
    address: 'Main Campus Road, Visca, Baybay',
    distanceKm: 2.8,
    etaMinutes: 6,
    category: 'landmark',
    mapX: 0.22,
    mapY: 0.41,
  },
  {
    id: 'loc-home',
    name: 'Home (Upper Guadalupe)',
    address: 'Zone 3, Upper Guadalupe, Baybay 6521',
    distanceKm: 1.5,
    etaMinutes: 4,
    category: 'home',
    mapX: 0.54,
    mapY: 0.58,
  },
  {
    id: 'loc-stomach-inn',
    name: 'Stomach Inn & Cafe',
    address: 'Highway Front, Upper Guadalupe, Baybay',
    distanceKm: 1.9,
    etaMinutes: 5,
    category: 'store',
    mapX: 0.45,
    mapY: 0.46,
  },
  {
    id: 'loc-market',
    name: 'Baybay City Public Market',
    address: 'R. Magsaysay Ave, Poblacion, Baybay',
    distanceKm: 6.2,
    etaMinutes: 14,
    category: 'landmark',
    mapX: 0.80,
    mapY: 0.74,
  },
  {
    id: 'loc-baywalk',
    name: 'Baybay Baywalk Boulevard',
    address: 'R. Magsaysay Blvd, Poblacion, Baybay',
    distanceKm: 5.8,
    etaMinutes: 12,
    category: 'landmark',
    mapX: 0.18,
    mapY: 0.76,
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
    subtitle: 'Instant e-wallet • 0917 ••• 4821',
    shortLabel: 'GCash ••4821',
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
    label: 'Apple Pay / Card',
    subtitle: 'Visa •••• 9012',
    shortLabel: 'Visa ••9012',
    icon: 'card-outline',
  },
];

export const SAMPLE_DRIVERS: DriverProfile[] = [
  {
    id: 'drv-1',
    name: 'Marco Reyes',
    initials: 'MR',
    rating: 4.9,
    tripsCompleted: 1420,
    vehicleModel: 'Toyota Vios',
    vehicleColor: 'Silver',
    plateNumber: 'ABC 4821',
    phone: '+63 917 555 0192',
    verified: true,
  },
  {
    id: 'drv-2',
    name: 'Jun Dela Cruz',
    initials: 'JD',
    rating: 4.85,
    tripsCompleted: 980,
    vehicleModel: 'Honda Click 160i',
    vehicleColor: 'Matte Black',
    plateNumber: 'LYT 9204',
    phone: '+63 918 555 0147',
    verified: true,
  },
  {
    id: 'drv-3',
    name: 'Elena Santos',
    initials: 'ES',
    rating: 4.96,
    tripsCompleted: 2105,
    vehicleModel: 'Mitsubishi Xpander',
    vehicleColor: 'Pearl White',
    plateNumber: 'EVS 3319',
    phone: '+63 927 555 0114',
    verified: true,
  },
];

export const INITIAL_TRIPS: TripRecord[] = [
  {
    id: 'trip-101',
    category: 'taxi',
    pickup: BAYBAY_PLACES[0]!,
    destination: BAYBAY_PLACES[1]!,
    tierName: 'Ryde Economy',
    driver: SAMPLE_DRIVERS[0]!,
    paymentMethod: 'gcash',
    baseFare: 40,
    distanceFare: 24,
    bookingFee: 0,
    tipAmount: 10,
    totalFare: 64,
    distanceKm: 3.4,
    durationMin: 9,
    dateLabel: 'Today, 2:14 PM',
    status: 'Completed',
    ratingGiven: 5,
  },
  {
    id: 'trip-102',
    category: 'motor',
    pickup: BAYBAY_PLACES[3]!,
    destination: BAYBAY_PLACES[5]!,
    tierName: 'Ryde Motor',
    driver: SAMPLE_DRIVERS[1]!,
    paymentMethod: 'cash',
    baseFare: 22,
    distanceFare: 26,
    bookingFee: 0,
    tipAmount: 0,
    totalFare: 48,
    distanceKm: 4.3,
    durationMin: 11,
    dateLabel: 'Yesterday, 5:40 PM',
    status: 'Completed',
    ratingGiven: 5,
  },
  {
    id: 'trip-103',
    category: 'taxi',
    pickup: BAYBAY_PLACES[0]!,
    destination: BAYBAY_PLACES[2]!,
    tierName: 'Ryde Economy',
    driver: SAMPLE_DRIVERS[2]!,
    paymentMethod: 'gcash',
    baseFare: 40,
    distanceFare: 18,
    bookingFee: 0,
    tipAmount: 20,
    totalFare: 58,
    distanceKm: 2.6,
    durationMin: 7,
    dateLabel: 'Nov 21, 9:10 AM',
    status: 'Completed',
    ratingGiven: 5,
  },
  {
    id: 'trip-104',
    category: 'food',
    pickup: BAYBAY_PLACES[4]!,
    destination: BAYBAY_PLACES[3]!,
    tierName: 'Ryde Food Express',
    driver: SAMPLE_DRIVERS[1]!,
    paymentMethod: 'gcash',
    baseFare: 15,
    distanceFare: 170,
    bookingFee: 0,
    tipAmount: 15,
    totalFare: 185,
    distanceKm: 1.9,
    durationMin: 18,
    dateLabel: 'Nov 19, 7:22 PM',
    status: 'Delivered',
    ratingGiven: 5,
  },
];

export const INITIAL_PROMOS: PromoCode[] = [
  {
    id: 'promo-1',
    code: 'VSUFREE20',
    title: '₱20 off any VSU Campus ride',
    discountAmount: 20,
    expiry: 'Valid until Dec 31, 2026',
  },
  {
    id: 'promo-2',
    code: 'RYDE26',
    title: '15% off Ryde Comfort & XL',
    discountAmount: 15,
    expiry: 'Valid until Dec 15, 2026',
  },
];

export const INITIAL_CONTACTS: EmergencyContact[] = [
  {
    id: 'em-1',
    name: 'Maria Mendoza',
    relation: 'Mother',
    phone: '+63 917 811 2409',
  },
  {
    id: 'em-2',
    name: 'VSU Campus Security',
    relation: '24/7 Campus Dispatch',
    phone: '(053) 565-0600',
  },
];

export function calculateTierFare(
  tier: RideTier,
  pickup: PlaceLocation,
  destination: PlaceLocation,
  promoDiscount = 0
): { baseFare: number; distanceFare: number; distanceKm: number; totalFare: number } {
  const dx = (destination.mapX - pickup.mapX) * 8.5;
  const dy = (destination.mapY - pickup.mapY) * 8.5;
  const computedKm = Math.max(1.2, Number(Math.hypot(dx, dy).toFixed(1)));
  // Keep 7/11 Utod -> DCST VSU exact to Figma reference (3.4 km, ₱64.00 for Economy)
  const isDefaultRoute =
    pickup.id === 'loc-utod' && destination.id === 'loc-dcst';
  const distanceKm = isDefaultRoute ? 3.4 : computedKm;
  const distanceFare = Math.round(distanceKm * tier.perKmRate);
  const rawTotal = tier.baseFare + distanceFare;
  const totalFare = Math.max(tier.baseFare, rawTotal - promoDiscount);
  return {
    baseFare: tier.baseFare,
    distanceFare,
    distanceKm,
    totalFare,
  };
}
