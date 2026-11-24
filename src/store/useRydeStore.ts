import { create } from 'zustand';
import {
  BAYBAY_PLACES,
  calculateTierFare,
  INITIAL_CONTACTS,
  INITIAL_PROMOS,
  INITIAL_TRIPS,
  RIDE_TIERS,
  SAMPLE_DRIVERS,
} from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { fetchRoadRouteOSRM, getCurrentGpsLocation } from '@/services/geoService';
import {
  acceptRideRpc,
  addEmergencyContactApi,
  completeRidePaymentRpc,
  createRideRecord,
  deleteFavoritePlaceApi,
  fetchActivePromos,
  fetchDriverProfileById,
  fetchEmergencyContacts,
  fetchFavoritePlaces,
  fetchOpenRideRequests,
  fetchOwnDriverVehicle,
  fetchRideMessages,
  fetchUserProfile,
  fetchUserTrips,
  fetchWalletTransactions,
  saveFavoritePlaceApi,
  sendRideMessageApi,
  topUpWalletRpc,
  updateRideStatus,
  updateUserProfile,
  upsertDriverVehicle,
} from '@/services/rydeApi';
import {
  ChatMessage,
  DriverProfile,
  DriverVehicleProfile,
  EmergencyContact,
  LatLng,
  LiveRide,
  PaymentMethodId,
  PlaceLocation,
  PromoCode,
  RideTierId,
  RouteGeometry,
  ScheduleOptionId,
  ServiceCategory,
  ThemeMode,
  TripRecord,
  TripStatus,
  UserProfile,
  WalletTransaction,
} from '@/types';

interface RydeState {
  // Appearance & Backend Status
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isLiveBackend: boolean;

  // Auth & User
  isAuthenticated: boolean;
  authLoading: boolean;
  pendingPhone: string;
  user: UserProfile;
  driverVehicle: DriverVehicleProfile | null;
  setPendingPhone: (phone: string) => void;
  hydrateFromSupabase: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (payload: {
    email: string;
    password: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
  }) => Promise<string | null>;
  completeAuth: (firstName: string, middleName: string, lastName: string) => void;
  quickDemoSignIn: () => void;
  signOut: () => Promise<void>;

  // Wallet Ledger
  walletTransactions: WalletTransaction[];
  topUpWallet: (
    amount: number,
    method?: string,
    reference?: string | null
  ) => Promise<void>;

  // Booking & Live OSRM Routing
  selectedService: ServiceCategory;
  pickup: PlaceLocation;
  destination: PlaceLocation | null;
  routeGeometry: RouteGeometry | null;
  loadingRoute: boolean;
  loadingGps: boolean;
  selectedTierId: RideTierId;
  selectedPayment: PaymentMethodId;
  paymentReference: string;
  scheduleOption: ScheduleOptionId;
  scheduledTimeLabel: string;
  appliedPromo: PromoCode | null;

  setSelectedService: (service: ServiceCategory) => void;
  setPickup: (place: PlaceLocation) => void;
  setDestination: (place: PlaceLocation | null) => void;
  swapStops: () => void;
  refreshRoute: () => Promise<void>;
  locateUserGps: () => Promise<PlaceLocation | null>;
  setSelectedTierId: (tierId: RideTierId) => void;
  setSelectedPayment: (payment: PaymentMethodId) => void;
  setPaymentReference: (ref: string) => void;
  setScheduleOption: (opt: ScheduleOptionId, label: string) => void;
  applyPromo: (promo: PromoCode | null) => void;

  // Active Live Ride (Rider side + Realtime sync)
  activeRide: LiveRide | null;
  tripStatus: TripStatus;
  assignedDriver: DriverProfile;
  driverEtaMin: number;
  driverCoords: LatLng | null;
  chatMessages: ChatMessage[];
  startRideRequest: () => Promise<LiveRide | null>;
  syncLiveRideUpdate: (ride: LiveRide) => Promise<void>;
  appendRealtimeMessage: (msg: ChatMessage) => void;
  assignDriver: () => void;
  advanceTripPhase: () => Promise<void>;
  cancelActiveTrip: () => Promise<void>;
  sendChatMessage: (text: string, role?: 'rider' | 'driver') => Promise<void>;
  completeTripAndRate: (rating: number, tipAmount: number) => Promise<void>;

  // Driver Mode
  openRequests: LiveRide[];
  driverActiveRide: LiveRide | null;
  refreshOpenRequests: () => Promise<void>;
  saveDriverVehicle: (vehicle: Omit<DriverVehicleProfile, 'userId' | 'totalEarnings' | 'verified'>) => Promise<void>;
  toggleDriverOnline: (online: boolean) => Promise<void>;
  acceptRideAsDriver: (rideId: string) => Promise<boolean>;
  updateDriverRideStage: (nextStatus: TripStatus, coords?: LatLng) => Promise<void>;

  // History, Favorites, Safety & Promos
  trips: TripRecord[];
  favorites: PlaceLocation[];
  promos: PromoCode[];
  emergencyContacts: EmergencyContact[];
  addFavorite: (place: PlaceLocation) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  rebookTrip: (trip: TripRecord) => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'local-demo-user',
  email: 'chris@ryde.ph',
  firstName: 'Chris',
  middleName: '',
  lastName: 'Mendoza',
  phone: '+63 917 482 1094',
  rating: 4.95,
  walletBalance: 420.0,
  totalTrips: 42,
  role: 'both',
};

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'driver',
    text: 'Maayong adlaw! On my way to your pickup point now.',
    timestamp: 'Just now',
  },
];

export const useRydeStore = create<RydeState>((set, get) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
  isLiveBackend: isSupabaseConfigured,

  isAuthenticated: false,
  authLoading: false,
  pendingPhone: '917 482 1094',
  user: DEFAULT_USER,
  driverVehicle: null,
  walletTransactions: [],

  setPendingPhone: (pendingPhone) => set({ pendingPhone }),

  hydrateFromSupabase: async () => {
    if (!supabase) return false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isAuthenticated: false });
        return false;
      }

      const uid = session.user.id;
      const [profile, vehicle, favs, contacts, promos, txs, trips] =
        await Promise.all([
          fetchUserProfile(uid),
          fetchOwnDriverVehicle(uid),
          fetchFavoritePlaces(uid),
          fetchEmergencyContacts(uid),
          fetchActivePromos(),
          fetchWalletTransactions(uid),
          fetchUserTrips(uid, SAMPLE_DRIVERS[0]!),
        ]);

      set((state) => ({
        isAuthenticated: true,
        user: profile ?? {
          ...state.user,
          id: uid,
          email: session.user.email ?? state.user.email,
        },
        driverVehicle: vehicle,
        favorites: favs.length > 0 ? favs : state.favorites,
        emergencyContacts: contacts.length > 0 ? contacts : state.emergencyContacts,
        promos: promos.length > 0 ? promos : state.promos,
        walletTransactions: txs,
        trips: trips.length > 0 ? trips : state.trips,
      }));
      return true;
    } catch {
      return false;
    }
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) {
      set({ isAuthenticated: true });
      return null;
    }
    set({ authLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        set({ authLoading: false });
        return error.message;
      }
      await get().hydrateFromSupabase();
      set({ authLoading: false });
      return null;
    } catch (e) {
      set({ authLoading: false });
      return e instanceof Error ? e.message : 'Unable to sign in';
    }
  },

  signUpWithEmail: async ({
    email,
    password,
    firstName,
    middleName,
    lastName,
    phone,
  }) => {
    if (!supabase) {
      get().completeAuth(firstName, middleName, lastName);
      return null;
    }
    set({ authLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            middle_name: middleName.trim(),
            last_name: lastName.trim(),
            phone: phone.startsWith('+63') ? phone : `+63 ${phone.trim()}`,
          },
        },
      });
      if (error) {
        set({ authLoading: false });
        return error.message;
      }
      if (data.session) {
        await get().hydrateFromSupabase();
      } else {
        set({ authLoading: false });
        return 'Account created! Please check your email to confirm, or disable Confirm Email in Supabase Auth settings for instant sign-in.';
      }
      set({ authLoading: false });
      return null;
    } catch (e) {
      set({ authLoading: false });
      return e instanceof Error ? e.message : 'Unable to create account';
    }
  },

  completeAuth: (firstName, middleName, lastName) => {
    const state = get();
    const updatedPhone = `+63 ${state.pendingPhone.trim() || '917 482 1094'}`;
    if (supabase && state.user.id !== 'local-demo-user') {
      updateUserProfile(state.user.id, {
        first_name: firstName.trim() || state.user.firstName,
        middle_name: middleName.trim(),
        last_name: lastName.trim() || state.user.lastName,
        phone: updatedPhone,
      }).catch(() => {});
    }
    set({
      isAuthenticated: true,
      user: {
        ...state.user,
        firstName: firstName.trim() || 'Chris',
        middleName: middleName.trim(),
        lastName: lastName.trim() || 'Mendoza',
        phone: updatedPhone,
      },
    });
  },

  quickDemoSignIn: () =>
    set({
      isAuthenticated: true,
      user: DEFAULT_USER,
    }),

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    set({
      isAuthenticated: false,
      tripStatus: 'idle',
      activeRide: null,
      driverActiveRide: null,
    });
  },

  topUpWallet: async (amount, method = 'gcash', reference = null) => {
    const state = get();
    if (supabase && state.user.id !== 'local-demo-user') {
      const nextBal = await topUpWalletRpc(amount, method, reference);
      if (nextBal !== null) {
        const txs = await fetchWalletTransactions(state.user.id);
        set({
          user: { ...state.user, walletBalance: nextBal },
          walletTransactions: txs,
        });
        return;
      }
    }
    set({
      user: {
        ...state.user,
        walletBalance: state.user.walletBalance + amount,
      },
      walletTransactions: [
        {
          id: `tx-${Date.now()}`,
          kind: 'top_up',
          amount,
          paymentMethod: method,
          referenceCode: reference,
          description: `Wallet Top-Up via ${method.toUpperCase()}`,
          createdAt: 'Just now',
        },
        ...state.walletTransactions,
      ],
    });
  },

  selectedService: 'motor',
  pickup: BAYBAY_PLACES[0]!,
  destination: BAYBAY_PLACES[1]!,
  routeGeometry: null,
  loadingRoute: false,
  loadingGps: false,
  selectedTierId: 'economy',
  selectedPayment: 'gcash',
  paymentReference: '',
  scheduleOption: 'now',
  scheduledTimeLabel: 'Leave Now',
  appliedPromo: null,

  setSelectedService: (selectedService) => {
    const mappedTier: RideTierId =
      selectedService === 'motor' ? 'motor' : 'economy';
    set({ selectedService, selectedTierId: mappedTier });
  },

  setPickup: (pickup) => {
    set({ pickup });
    get().refreshRoute().catch(() => {});
  },

  setDestination: (destination) => {
    set({ destination });
    if (destination) {
      get().refreshRoute().catch(() => {});
    } else {
      set({ routeGeometry: null });
    }
  },

  swapStops: () => {
    const { pickup, destination } = get();
    if (!destination) return;
    set({ pickup: destination, destination: pickup });
    get().refreshRoute().catch(() => {});
  },

  refreshRoute: async () => {
    const { pickup, destination } = get();
    if (!destination) return;
    set({ loadingRoute: true });
    const route = await fetchRoadRouteOSRM(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: destination.lat, lng: destination.lng }
    );
    set({ routeGeometry: route, loadingRoute: false });
  },

  locateUserGps: async () => {
    set({ loadingGps: true });
    const loc = await getCurrentGpsLocation();
    if (loc) {
      set({ pickup: loc, loadingGps: false });
      get().refreshRoute().catch(() => {});
      return loc;
    }
    set({ loadingGps: false });
    return null;
  },

  setSelectedTierId: (selectedTierId) => set({ selectedTierId }),
  setSelectedPayment: (selectedPayment) => set({ selectedPayment }),
  setPaymentReference: (paymentReference) => set({ paymentReference }),
  setScheduleOption: (scheduleOption, scheduledTimeLabel) =>
    set({ scheduleOption, scheduledTimeLabel }),
  applyPromo: (appliedPromo) => set({ appliedPromo }),

  activeRide: null,
  tripStatus: 'idle',
  assignedDriver: SAMPLE_DRIVERS[0]!,
  driverEtaMin: 3,
  driverCoords: null,
  chatMessages: INITIAL_CHAT,

  startRideRequest: async () => {
    const state = get();
    const tier =
      RIDE_TIERS.find((t) => t.id === state.selectedTierId) ?? RIDE_TIERS[1]!;
    const dest = state.destination ?? BAYBAY_PLACES[1]!;
    const route =
      state.routeGeometry ??
      (await fetchRoadRouteOSRM(
        { lat: state.pickup.lat, lng: state.pickup.lng },
        { lat: dest.lat, lng: dest.lng }
      ));
    const fare = calculateTierFare(
      tier,
      state.pickup,
      dest,
      state.appliedPromo?.discountAmount ?? 0,
      route.distanceKm
    );

    const fallbackDriver =
      tier.id === 'motor'
        ? SAMPLE_DRIVERS[1]!
        : tier.id === 'xl'
          ? SAMPLE_DRIVERS[2]!
          : SAMPLE_DRIVERS[0]!;

    let createdRide: LiveRide | null = null;
    if (supabase && state.user.id !== 'local-demo-user') {
      createdRide = await createRideRecord({
        riderId: state.user.id,
        category: state.selectedService,
        tierId: tier.id,
        tierName: tier.name,
        pickup: state.pickup,
        destination: dest,
        distanceKm: fare.distanceKm,
        durationMin: route.durationMin,
        baseFare: fare.baseFare,
        distanceFare: fare.distanceFare,
        promoDiscount: state.appliedPromo?.discountAmount ?? 0,
        promoCode: state.appliedPromo?.code ?? null,
        totalFare: fare.totalFare,
        paymentMethod: state.selectedPayment,
        paymentReference: state.paymentReference.trim() || null,
        scheduledFor: state.scheduledTimeLabel,
      });
    }

    set({
      routeGeometry: route,
      activeRide: createdRide,
      tripStatus: 'searching',
      assignedDriver: fallbackDriver,
      driverEtaMin: tier.etaMinutes,
      driverCoords: {
        lat: (state.pickup.lat + dest.lat) / 2,
        lng: (state.pickup.lng + dest.lng) / 2,
      },
      chatMessages: createdRide
        ? []
        : [
            {
              id: 'msg-init',
              sender: 'driver',
              text: `Hi ${state.user.firstName}! Heading to ${state.pickup.name} now.`,
              timestamp: 'Just now',
            },
          ],
    });
    return createdRide;
  },

  syncLiveRideUpdate: async (ride) => {
    let drv = get().assignedDriver;
    if (ride.driverId && ride.driverId !== drv.id) {
      const realDriver = await fetchDriverProfileById(ride.driverId);
      if (realDriver) drv = realDriver;
    }
    const msgs = await fetchRideMessages(ride.id);
    set({
      activeRide: ride,
      tripStatus: ride.status,
      assignedDriver: drv,
      driverCoords: ride.driverCoords ?? get().driverCoords,
      chatMessages: msgs.length > 0 ? msgs : get().chatMessages,
    });
  },

  appendRealtimeMessage: (msg) =>
    set((state) => {
      if (state.chatMessages.some((m) => m.id === msg.id)) return state;
      return { chatMessages: [...state.chatMessages, msg] };
    }),

  assignDriver: () => {
    const { pickup, destination } = get();
    const dest = destination ?? BAYBAY_PLACES[1]!;
    set({
      tripStatus: 'accepted',
      driverEtaMin: 3,
      driverCoords: {
        lat: pickup.lat + (dest.lat - pickup.lat) * 0.25,
        lng: pickup.lng + (dest.lng - pickup.lng) * 0.25,
      },
    });
  },

  advanceTripPhase: async () => {
    const state = get();
    const nextStatus: TripStatus =
      state.tripStatus === 'accepted' || state.tripStatus === 'arrived'
        ? 'in_trip'
        : 'completed';
    if (state.activeRide && supabase && state.user.id !== 'local-demo-user') {
      await updateRideStatus(state.activeRide.id, nextStatus);
    }
    set({
      tripStatus: nextStatus,
      driverEtaMin: nextStatus === 'in_trip' ? state.routeGeometry?.durationMin ?? 6 : 0,
    });
  },

  cancelActiveTrip: async () => {
    const { activeRide, user } = get();
    if (activeRide && supabase && user.id !== 'local-demo-user') {
      await updateRideStatus(activeRide.id, 'cancelled');
    }
    set({
      tripStatus: 'idle',
      activeRide: null,
    });
  },

  sendChatMessage: async (text, role = 'rider') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const state = get();
    const targetRide = role === 'driver' ? state.driverActiveRide : state.activeRide;
    if (targetRide && supabase && state.user.id !== 'local-demo-user') {
      const sent = await sendRideMessageApi(
        targetRide.id,
        state.user.id,
        role,
        trimmed
      );
      if (sent) {
        get().appendRealtimeMessage(sent);
        return;
      }
    }
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        {
          id: `msg-${Date.now()}`,
          sender: role,
          text: trimmed,
          timestamp: 'Now',
        },
      ],
    }));
  },

  completeTripAndRate: async (rating, tipAmount) => {
    const state = get();
    const tier =
      RIDE_TIERS.find((t) => t.id === state.selectedTierId) ?? RIDE_TIERS[1]!;
    const dest = state.destination ?? BAYBAY_PLACES[1]!;
    const fare = calculateTierFare(
      tier,
      state.pickup,
      dest,
      state.appliedPromo?.discountAmount ?? 0,
      state.routeGeometry?.distanceKm
    );

    if (state.activeRide && supabase && state.user.id !== 'local-demo-user') {
      await completeRidePaymentRpc(state.activeRide.id, rating, tipAmount);
      await get().hydrateFromSupabase();
      set({
        activeRide: null,
        tripStatus: 'idle',
        appliedPromo: null,
        paymentReference: '',
      });
      return;
    }

    const newRecord: TripRecord = {
      id: `trip-${Date.now()}`,
      category: state.selectedService,
      pickup: state.pickup,
      destination: dest,
      tierName: tier.name,
      driver: state.assignedDriver,
      paymentMethod: state.selectedPayment,
      paymentReference: state.paymentReference.trim() || null,
      baseFare: fare.baseFare,
      distanceFare: fare.distanceFare,
      bookingFee: 0,
      tipAmount,
      totalFare: fare.totalFare + tipAmount,
      distanceKm: fare.distanceKm,
      durationMin: state.routeGeometry?.durationMin ?? 8,
      dateLabel: 'Just now',
      status: 'Completed',
      ratingGiven: rating,
    };

    const nextBalance =
      state.selectedPayment === 'gcash' || state.selectedPayment === 'apple_pay'
        ? Math.max(0, state.user.walletBalance - newRecord.totalFare)
        : state.user.walletBalance;

    set({
      trips: [newRecord, ...state.trips],
      activeRide: null,
      tripStatus: 'idle',
      appliedPromo: null,
      paymentReference: '',
      user: {
        ...state.user,
        totalTrips: state.user.totalTrips + 1,
        walletBalance: nextBalance,
      },
    });
  },

  // Driver Mode
  openRequests: [],
  driverActiveRide: null,

  refreshOpenRequests: async () => {
    if (!supabase) {
      const { activeRide, tripStatus } = get();
      if (activeRide && tripStatus === 'searching') {
        set({ openRequests: [activeRide] });
      } else {
        set({ openRequests: [] });
      }
      return;
    }
    const open = await fetchOpenRideRequests();
    set({ openRequests: open });
  },

  saveDriverVehicle: async (vehicle) => {
    const state = get();
    const full: DriverVehicleProfile = {
      ...vehicle,
      userId: state.user.id,
      totalEarnings: state.driverVehicle?.totalEarnings ?? 0,
      verified: true,
    };
    if (supabase && state.user.id !== 'local-demo-user') {
      const saved = await upsertDriverVehicle(full);
      if (saved) {
        set({ driverVehicle: saved });
        return;
      }
    }
    set({ driverVehicle: full });
  },

  toggleDriverOnline: async (online) => {
    const state = get();
    const gps = online ? await getCurrentGpsLocation() : null;
    const base: DriverVehicleProfile = state.driverVehicle ?? {
      userId: state.user.id,
      vehicleModel: 'Toyota Vios',
      vehicleColor: 'Silver',
      plateNumber: 'ABC 4821',
      tierId: 'economy',
      isOnline: online,
      currentLat: gps?.lat ?? BAYBAY_PLACES[0]!.lat,
      currentLng: gps?.lng ?? BAYBAY_PLACES[0]!.lng,
      totalEarnings: 0,
      verified: true,
    };
    const next: DriverVehicleProfile = {
      ...base,
      isOnline: online,
      currentLat: gps?.lat ?? base.currentLat,
      currentLng: gps?.lng ?? base.currentLng,
    };
    if (supabase && state.user.id !== 'local-demo-user') {
      const saved = await upsertDriverVehicle(next);
      set({ driverVehicle: saved ?? next });
    } else {
      set({ driverVehicle: next });
    }
    if (online) {
      await get().refreshOpenRequests();
    }
  },

  acceptRideAsDriver: async (rideId) => {
    const state = get();
    const lat = state.driverVehicle?.currentLat ?? BAYBAY_PLACES[0]!.lat;
    const lng = state.driverVehicle?.currentLng ?? BAYBAY_PLACES[0]!.lng;
    if (supabase && state.user.id !== 'local-demo-user') {
      const accepted = await acceptRideRpc(rideId, lat, lng);
      if (!accepted) return false;
      const msgs = await fetchRideMessages(accepted.id);
      set({
        driverActiveRide: accepted,
        chatMessages: msgs,
      });
      await get().refreshOpenRequests();
      return true;
    }
    const found = state.openRequests.find((r) => r.id === rideId);
    if (!found) return false;
    set({
      driverActiveRide: { ...found, status: 'accepted', driverId: state.user.id },
      openRequests: state.openRequests.filter((r) => r.id !== rideId),
    });
    return true;
  },

  updateDriverRideStage: async (nextStatus, coords) => {
    const state = get();
    const active = state.driverActiveRide;
    if (!active) return;
    if (supabase && state.user.id !== 'local-demo-user') {
      const updated = await updateRideStatus(active.id, nextStatus, coords);
      if (nextStatus === 'completed' || nextStatus === 'cancelled') {
        set({ driverActiveRide: null });
        await get().hydrateFromSupabase();
        await get().refreshOpenRequests();
        return;
      }
      if (updated) {
        set({ driverActiveRide: updated });
      }
      return;
    }
    if (nextStatus === 'completed' || nextStatus === 'cancelled') {
      set({ driverActiveRide: null });
    } else {
      set({
        driverActiveRide: {
          ...active,
          status: nextStatus,
          driverCoords: coords ?? active.driverCoords,
        },
      });
    }
  },

  trips: INITIAL_TRIPS,
  favorites: [
    BAYBAY_PLACES[3]!,
    BAYBAY_PLACES[1]!,
    BAYBAY_PLACES[0]!,
    BAYBAY_PLACES[6]!,
  ],
  promos: INITIAL_PROMOS,
  emergencyContacts: INITIAL_CONTACTS,

  addFavorite: async (place) => {
    const state = get();
    if (state.favorites.some((f) => f.name === place.name)) return;
    if (supabase && state.user.id !== 'local-demo-user') {
      const saved = await saveFavoritePlaceApi(state.user.id, place);
      if (saved) {
        set({ favorites: [saved, ...state.favorites] });
        return;
      }
    }
    set({ favorites: [place, ...state.favorites] });
  },

  removeFavorite: async (id) => {
    const state = get();
    if (supabase && state.user.id !== 'local-demo-user') {
      await deleteFavoritePlaceApi(id);
    }
    set({ favorites: state.favorites.filter((f) => f.id !== id) });
  },

  addEmergencyContact: async (contact) => {
    const state = get();
    if (supabase && state.user.id !== 'local-demo-user') {
      const saved = await addEmergencyContactApi(state.user.id, contact);
      if (saved) {
        set({ emergencyContacts: [...state.emergencyContacts, saved] });
        return;
      }
    }
    set({
      emergencyContacts: [
        ...state.emergencyContacts,
        { ...contact, id: `em-${Date.now()}` },
      ],
    });
  },

  rebookTrip: (trip) => {
    set({
      selectedService: trip.category,
      pickup: trip.pickup,
      destination: trip.destination,
      selectedPayment: trip.paymentMethod,
    });
    get().refreshRoute().catch(() => {});
  },
}));
