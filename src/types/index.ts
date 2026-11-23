export type ThemeMode = 'system' | 'light' | 'dark';

export type ServiceCategory = 'motor' | 'taxi' | 'food' | 'services';

export type PaymentMethodId = 'gcash' | 'cash' | 'bank_transfer' | 'apple_pay';

export type ScheduleOptionId = 'now' | '15m' | '30m' | 'custom';

export type RideTierId = 'motor' | 'economy' | 'comfort' | 'xl';

export type TripStatus =
  | 'idle'
  | 'matching'
  | 'arriving'
  | 'in_trip'
  | 'completed';

export interface UserProfile {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  rating: number;
  walletBalance: number;
  totalTrips: number;
}

export interface PlaceLocation {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  etaMinutes: number;
  category?: 'home' | 'campus' | 'store' | 'landmark';
  /** Normalized map coordinates (0..1) on our interactive Baybay/VSU vector map */
  mapX: number;
  mapY: number;
}

export interface ServiceItem {
  id: ServiceCategory;
  label: string;
  startingFare: number;
  subtitle: string;
  icon: 'bicycle' | 'car' | 'fast-food' | 'cube';
}

export interface RideTier {
  id: RideTierId;
  name: string;
  tagline: string;
  seats: number;
  etaMinutes: number;
  baseFare: number;
  perKmRate: number;
  icon: 'bicycle' | 'car-sport' | 'car' | 'bus';
  badge?: string;
}

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  subtitle: string;
  shortLabel: string;
  icon: 'phone-portrait-outline' | 'cash-outline' | 'business-outline' | 'card-outline';
}

export interface DriverProfile {
  id: string;
  name: string;
  initials: string;
  rating: number;
  tripsCompleted: number;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
  phone: string;
  verified: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'rider' | 'driver';
  text: string;
  timestamp: string;
}

export interface TripRecord {
  id: string;
  category: ServiceCategory;
  pickup: PlaceLocation;
  destination: PlaceLocation;
  tierName: string;
  driver: DriverProfile;
  paymentMethod: PaymentMethodId;
  baseFare: number;
  distanceFare: number;
  bookingFee: number;
  tipAmount: number;
  totalFare: number;
  distanceKm: number;
  durationMin: number;
  dateLabel: string;
  status: 'Completed' | 'Delivered' | 'Cancelled';
  ratingGiven?: number;
}

export interface PromoCode {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  expiry: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}
