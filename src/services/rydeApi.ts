import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  ChatMessage,
  DriverProfile,
  DriverVehicleProfile,
  EmergencyContact,
  LiveRide,
  PaymentMethodId,
  PlaceLocation,
  PromoCode,
  RideTierId,
  ServiceCategory,
  TripRecord,
  TripStatus,
  UserProfile,
  WalletTransaction,
} from '@/types';

// Database row shapes
interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  rating: number;
  total_trips: number;
  wallet_balance: number;
  role: 'rider' | 'driver' | 'both';
}

interface DriverProfileRow {
  user_id: string;
  vehicle_model: string;
  vehicle_color: string;
  plate_number: string;
  tier_id: RideTierId;
  is_online: boolean;
  current_lat: number;
  current_lng: number;
  total_earnings: number;
  verified: boolean;
}

interface RideRow {
  id: string;
  rider_id: string;
  driver_id: string | null;
  category: ServiceCategory;
  tier_id: RideTierId;
  tier_name: string;
  status: TripStatus;
  pickup_name: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dest_name: string;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  driver_lat: number | null;
  driver_lng: number | null;
  distance_km: number;
  duration_min: number;
  base_fare: number;
  distance_fare: number;
  promo_discount: number;
  promo_code: string | null;
  tip_amount: number;
  total_fare: number;
  payment_method: PaymentMethodId;
  payment_reference: string | null;
  scheduled_for: string;
  rating_given: number | null;
  created_at: string;
}

interface RideMessageRow {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_role: 'rider' | 'driver';
  body: string;
  created_at: string;
}

export function mapRideRow(row: RideRow): LiveRide {
  return {
    id: row.id,
    riderId: row.rider_id,
    driverId: row.driver_id,
    category: row.category,
    tierId: row.tier_id,
    tierName: row.tier_name,
    status: row.status,
    pickup: {
      id: `pickup-${row.id}`,
      name: row.pickup_name,
      address: row.pickup_address,
      lat: row.pickup_lat,
      lng: row.pickup_lng,
      distanceKm: 0,
      etaMinutes: 1,
    },
    destination: {
      id: `dest-${row.id}`,
      name: row.dest_name,
      address: row.dest_address,
      lat: row.dest_lat,
      lng: row.dest_lng,
      distanceKm: Number(row.distance_km),
      etaMinutes: row.duration_min,
    },
    driverCoords:
      row.driver_lat !== null && row.driver_lng !== null
        ? { lat: row.driver_lat, lng: row.driver_lng }
        : null,
    distanceKm: Number(row.distance_km),
    durationMin: row.duration_min,
    baseFare: Number(row.base_fare),
    distanceFare: Number(row.distance_fare),
    promoDiscount: Number(row.promo_discount),
    promoCode: row.promo_code,
    tipAmount: Number(row.tip_amount),
    totalFare: Number(row.total_fare),
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    scheduledFor: row.scheduled_for,
    ratingGiven: row.rating_given,
    createdAt: row.created_at,
  };
}

function formatDateLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Recent';
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  const r = data as ProfileRow;
  return {
    id: r.id,
    email: r.email ?? '',
    firstName: r.first_name,
    middleName: r.middle_name ?? '',
    lastName: r.last_name,
    phone: r.phone,
    rating: Number(r.rating),
    walletBalance: Number(r.wallet_balance),
    totalTrips: r.total_trips,
    role: r.role,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{ first_name: string; middle_name: string; last_name: string; phone: string }>
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return !error;
}

export async function fetchDriverProfileById(
  driverId: string
): Promise<DriverProfile | null> {
  if (!supabase) return null;
  const [profRes, drvRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', driverId).single(),
    supabase.from('driver_profiles').select('*').eq('user_id', driverId).maybeSingle(),
  ]);
  const prof = profRes.data as ProfileRow | null;
  const drv = drvRes.data as DriverProfileRow | null;
  if (!prof) return null;
  const fullName = `${prof.first_name} ${prof.last_name}`.trim() || 'Ryde Driver';
  const initials =
    `${prof.first_name.charAt(0)}${prof.last_name.charAt(0) || prof.first_name.charAt(1)}`.toUpperCase() ||
    'RD';
  return {
    id: prof.id,
    name: fullName,
    initials,
    rating: Number(prof.rating),
    tripsCompleted: prof.total_trips,
    vehicleModel: drv?.vehicle_model ?? 'Toyota Vios',
    vehicleColor: drv?.vehicle_color ?? 'Silver',
    plateNumber: drv?.plate_number ?? 'RYD 2026',
    phone: prof.phone,
    verified: drv?.verified ?? true,
  };
}

export async function fetchOwnDriverVehicle(
  userId: string
): Promise<DriverVehicleProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  const d = data as DriverProfileRow;
  return {
    userId: d.user_id,
    vehicleModel: d.vehicle_model,
    vehicleColor: d.vehicle_color,
    plateNumber: d.plate_number,
    tierId: d.tier_id,
    isOnline: d.is_online,
    currentLat: d.current_lat,
    currentLng: d.current_lng,
    totalEarnings: Number(d.total_earnings),
    verified: d.verified,
  };
}

export async function upsertDriverVehicle(
  profile: DriverVehicleProfile
): Promise<DriverVehicleProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('driver_profiles')
    .upsert({
      user_id: profile.userId,
      vehicle_model: profile.vehicleModel,
      vehicle_color: profile.vehicleColor,
      plate_number: profile.plateNumber,
      tier_id: profile.tierId,
      is_online: profile.isOnline,
      current_lat: profile.currentLat,
      current_lng: profile.currentLng,
      verified: profile.verified,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) return null;
  const d = data as DriverProfileRow;
  return {
    userId: d.user_id,
    vehicleModel: d.vehicle_model,
    vehicleColor: d.vehicle_color,
    plateNumber: d.plate_number,
    tierId: d.tier_id,
    isOnline: d.is_online,
    currentLat: d.current_lat,
    currentLng: d.current_lng,
    totalEarnings: Number(d.total_earnings),
    verified: d.verified,
  };
}

export async function createRideRecord(payload: {
  riderId: string;
  category: ServiceCategory;
  tierId: RideTierId;
  tierName: string;
  pickup: PlaceLocation;
  destination: PlaceLocation;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  promoDiscount: number;
  promoCode: string | null;
  totalFare: number;
  paymentMethod: PaymentMethodId;
  paymentReference: string | null;
  scheduledFor: string;
}): Promise<LiveRide | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('rides')
    .insert({
      rider_id: payload.riderId,
      category: payload.category,
      tier_id: payload.tierId,
      tier_name: payload.tierName,
      status: 'searching',
      pickup_name: payload.pickup.name,
      pickup_address: payload.pickup.address,
      pickup_lat: payload.pickup.lat,
      pickup_lng: payload.pickup.lng,
      dest_name: payload.destination.name,
      dest_address: payload.destination.address,
      dest_lat: payload.destination.lat,
      dest_lng: payload.destination.lng,
      distance_km: payload.distanceKm,
      duration_min: payload.durationMin,
      base_fare: payload.baseFare,
      distance_fare: payload.distanceFare,
      promo_discount: payload.promoDiscount,
      promo_code: payload.promoCode,
      total_fare: payload.totalFare,
      payment_method: payload.paymentMethod,
      payment_reference: payload.paymentReference,
      scheduled_for: payload.scheduledFor,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return mapRideRow(data as RideRow);
}

export async function fetchOpenRideRequests(): Promise<LiveRide[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('rides')
    .select('*')
    .eq('status', 'searching')
    .order('created_at', { ascending: false })
    .limit(20);
  if (!data) return [];
  return (data as RideRow[]).map(mapRideRow);
}

export async function acceptRideRpc(
  rideId: string,
  driverLat: number,
  driverLng: number
): Promise<LiveRide | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('accept_ride', {
    p_ride_id: rideId,
    p_driver_lat: driverLat,
    p_driver_lng: driverLng,
  });
  if (error || !data) return null;
  return mapRideRow(data as RideRow);
}

export async function updateRideStatus(
  rideId: string,
  status: TripStatus,
  driverCoords?: { lat: number; lng: number }
): Promise<LiveRide | null> {
  if (!supabase) return null;
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (driverCoords) {
    patch.driver_lat = driverCoords.lat;
    patch.driver_lng = driverCoords.lng;
  }
  const { data, error } = await supabase
    .from('rides')
    .update(patch)
    .eq('id', rideId)
    .select('*')
    .single();
  if (error || !data) return null;
  return mapRideRow(data as RideRow);
}

export async function completeRidePaymentRpc(
  rideId: string,
  rating: number,
  tip: number
): Promise<LiveRide | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('complete_ride_payment', {
    p_ride_id: rideId,
    p_rating: rating,
    p_tip: tip,
  });
  if (error || !data) return null;
  return mapRideRow(data as RideRow);
}

export async function fetchUserTrips(userId: string): Promise<TripRecord[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('rides')
    .select('*')
    .or(`rider_id.eq.${userId},driver_id.eq.${userId}`)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(40);
  if (!data || data.length === 0) return [];

  const rows = data as RideRow[];
  const driverIds = [
    ...new Set(rows.map((r) => r.driver_id).filter((id): id is string => Boolean(id))),
  ];
  const driverEntries = await Promise.all(
    driverIds.map(async (id) => [id, await fetchDriverProfileById(id)] as const)
  );
  const driverMap = new Map<string, DriverProfile>();
  for (const [id, profile] of driverEntries) {
    if (profile) driverMap.set(id, profile);
  }

  return rows.map((row) => {
    const ride = mapRideRow(row);
    const resolvedDriver: DriverProfile =
      (ride.driverId ? driverMap.get(ride.driverId) : null) ?? {
        id: ride.driverId ?? 'unassigned',
        name: 'Ryde Driver',
        initials: 'RD',
        rating: 5.0,
        tripsCompleted: 0,
        vehicleModel: ride.tierName,
        vehicleColor: '',
        plateNumber: '—',
        phone: '',
        verified: true,
      };

    return {
      id: ride.id,
      category: ride.category,
      pickup: ride.pickup,
      destination: ride.destination,
      tierName: ride.tierName,
      driver: resolvedDriver,
      paymentMethod: ride.paymentMethod,
      paymentReference: ride.paymentReference,
      baseFare: ride.baseFare,
      distanceFare: ride.distanceFare,
      bookingFee: 0,
      tipAmount: ride.tipAmount,
      totalFare: ride.totalFare,
      distanceKm: ride.distanceKm,
      durationMin: ride.durationMin,
      dateLabel: formatDateLabel(ride.createdAt),
      status: ride.status === 'cancelled' ? 'Cancelled' : 'Completed',
      ratingGiven: ride.ratingGiven ?? undefined,
    };
  });
}

export async function fetchRideMessages(rideId: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('ride_messages')
    .select('*')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  if (!data) return [];
  return (data as RideMessageRow[]).map((m) => ({
    id: m.id,
    rideId: m.ride_id,
    senderId: m.sender_id,
    sender: m.sender_role,
    text: m.body,
    timestamp: formatDateLabel(m.created_at),
  }));
}

export async function sendRideMessageApi(
  rideId: string,
  senderId: string,
  senderRole: 'rider' | 'driver',
  body: string
): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ride_messages')
    .insert({
      ride_id: rideId,
      sender_id: senderId,
      sender_role: senderRole,
      body,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  const m = data as RideMessageRow;
  return {
    id: m.id,
    rideId: m.ride_id,
    senderId: m.sender_id,
    sender: m.sender_role,
    text: m.body,
    timestamp: 'Now',
  };
}

export async function topUpWalletRpc(
  amount: number,
  method: string,
  reference: string | null
): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('top_up_wallet', {
    p_amount: amount,
    p_method: method,
    p_reference: reference,
  });
  if (error || data === null || data === undefined) return null;
  return Number(data);
}

export async function fetchWalletTransactions(
  userId: string
): Promise<WalletTransaction[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (!data) return [];
  return (
    data as Array<{
      id: string;
      kind: WalletTransaction['kind'];
      amount: number;
      payment_method: string;
      reference_code: string | null;
      description: string;
      created_at: string;
    }>
  ).map((t) => ({
    id: t.id,
    kind: t.kind,
    amount: Number(t.amount),
    paymentMethod: t.payment_method,
    referenceCode: t.reference_code,
    description: t.description,
    createdAt: formatDateLabel(t.created_at),
  }));
}

export async function fetchFavoritePlaces(
  userId: string
): Promise<PlaceLocation[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('favorite_places')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (
    data as Array<{
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      category: PlaceLocation['category'];
    }>
  ).map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    distanceKm: 2.0,
    etaMinutes: 5,
    category: p.category,
  }));
}

export async function saveFavoritePlaceApi(
  userId: string,
  place: PlaceLocation
): Promise<PlaceLocation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('favorite_places')
    .insert({
      user_id: userId,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      category: place.category ?? 'landmark',
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return { ...place, id: (data as { id: string }).id };
}

export async function deleteFavoritePlaceApi(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('favorite_places').delete().eq('id', id);
  return !error;
}

export async function fetchEmergencyContacts(
  userId: string
): Promise<EmergencyContact[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!data) return [];
  return data as EmergencyContact[];
}

export async function addEmergencyContactApi(
  userId: string,
  contact: Omit<EmergencyContact, 'id'>
): Promise<EmergencyContact | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert({ user_id: userId, ...contact })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as EmergencyContact;
}

export async function fetchActivePromos(): Promise<PromoCode[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('is_active', true);
  if (!data) return [];
  return (
    data as Array<{
      id: string;
      code: string;
      title: string;
      discount_amount: number;
      expires_at: string;
    }>
  ).map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    discountAmount: Number(p.discount_amount),
    expiry: `Valid until ${formatDateLabel(p.expires_at)}`,
  }));
}

export function subscribeToRide(
  rideId: string,
  onRideUpdate: (ride: LiveRide) => void,
  onNewMessage: (msg: ChatMessage) => void
): RealtimeChannel | null {
  if (!supabase) return null;
  const channel = supabase
    .channel(`ride-live-${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`,
      },
      (payload) => {
        if (payload.new) {
          onRideUpdate(mapRideRow(payload.new as RideRow));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_messages',
        filter: `ride_id=eq.${rideId}`,
      },
      (payload) => {
        if (payload.new) {
          const m = payload.new as RideMessageRow;
          onNewMessage({
            id: m.id,
            rideId: m.ride_id,
            senderId: m.sender_id,
            sender: m.sender_role,
            text: m.body,
            timestamp: 'Now',
          });
        }
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToSearchingRides(
  onChange: () => void
): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel('driver-searching-rides')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
      },
      () => onChange()
    )
    .subscribe();
}
