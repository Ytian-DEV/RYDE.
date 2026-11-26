export type ThemeMode = 'system' | 'light' | 'dark';

export type ServiceCategory = 'motor' | 'taxi' | 'food' | 'services';

export type PaymentMethodId = 'gcash' | 'cash' | 'bank_transfer' | 'apple_pay';

export type ScheduleOptionId = 'now' | '15m' | '30m' | 'custom';

export type RideTierId = 'motor' | 'economy' | 'comfort' | 'xl';

export type TripStatus =
  | 'idle'
  | 'searching'
  | 'accepted'
  | 'arrived'
  | 'in_trip'
  | 'completed'
  | 'cancelled';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  coords: Array<[number, number]>; // [lat, lng] road polyline from OSRM
  distanceKm: number;
  durationMin: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  rating: number;
  walletBalance: number;
  totalTrips: number;
  role: 'rider' | 'driver' | 'both';
}

export interface DriverVehicleProfile {
  userId: string;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
  tierId: RideTierId;
  isOnline: boolean;
  currentLat: number;
  currentLng: number;
  totalEarnings: number;
  verified: boolean;
}

export interface PlaceLocation {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  etaMinutes: number;
  category?: 'home' | 'campus' | 'store' | 'landmark';
  lat: number;
  lng: number;
  /** Normalized fallback coordinates for offline preview */
  mapX?: number;
  mapY?: number;
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
  rideId?: string;
  senderId?: string;
  sender: 'rider' | 'driver';
  text: string;
  timestamp: string;
}

export interface LiveRide {
  id: string;
  riderId: string;
  driverId: string | null;
  category: ServiceCategory;
  tierId: RideTierId;
  tierName: string;
  status: TripStatus;
  pickup: PlaceLocation;
  destination: PlaceLocation;
  driverCoords: LatLng | null;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  promoDiscount: number;
  promoCode: string | null;
  tipAmount: number;
  totalFare: number;
  paymentMethod: PaymentMethodId;
  paymentReference: string | null;
  scheduledFor: string;
  ratingGiven?: number | null;
  createdAt: string;
}

export interface TripRecord {
  id: string;
  category: ServiceCategory;
  pickup: PlaceLocation;
  destination: PlaceLocation;
  tierName: string;
  driver: DriverProfile;
  paymentMethod: PaymentMethodId;
  paymentReference?: string | null;
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

export interface WalletTransaction {
  id: string;
  kind: 'top_up' | 'ride_payment' | 'driver_earning' | 'tip' | 'refund';
  amount: number;
  paymentMethod: string;
  referenceCode: string | null;
  description: string;
  createdAt: string;
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
