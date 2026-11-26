import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

WebBrowser.maybeCompleteAuthSession();
import { calculateTierFare, RIDE_TIERS } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  DEFAULT_CENTER,
  fetchRoadRouteOSRM,
  getCurrentGpsLocation,
} from '@/services/geoService';
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

const EMPTY_USER: UserProfile = {
  id: '',
  email: '',
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  rating: 0,
  walletBalance: 0,
  totalTrips: 0,
  role: 'rider',
};

const UNASSIGNED_DRIVER: DriverProfile = {
  id: '',
  name: 'Waiting for driver',
  initials: 'RD',
  rating: 0,
  tripsCompleted: 0,
  vehicleModel: '',
  vehicleColor: '',
  plateNumber: '—',
  phone: '',
  verified: false,
};

const DEFAULT_PICKUP: PlaceLocation = {
  id: 'gps-current',
  name: 'Current Location',
  address: 'Tap GPS button to detect your street',
  distanceKm: 0,
  etaMinutes: 0,
  lat: DEFAULT_CENTER.lat,
  lng: DEFAULT_CENTER.lng,
};

async function clearAnyLegacyLocalCache(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('ryde-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const rydeKeys = keys.filter((k) => k.startsWith('ryde-'));
      if (rydeKeys.length > 0) {
        await AsyncStorage.multiRemove(rydeKeys);
      }
    }
  } catch {
    // Storage cleanup is best-effort
  }
}

interface RydeState {
  // Appearance & Backend Status
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isLiveBackend: boolean;

  // Auth & User
  isAuthenticated: boolean;
  authLoading: boolean;
  oauthProviderLoading: 'google' | 'facebook' | null;
  hydrating: boolean;
  pendingPhone: string;
  user: UserProfile;
  driverVehicle: DriverVehicleProfile | null;
  setPendingPhone: (phone: string) => void;
  resetUserState: () => void;
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
  signInWithOAuth: (provider: 'google' | 'facebook') => Promise<string | null>;
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
  saveDriverVehicle: (
    vehicle: Omit<DriverVehicleProfile, 'userId' | 'totalEarnings' | 'verified'>
  ) => Promise<void>;
  toggleDriverOnline: (online: boolean) => Promise<void>;
  acceptRideAsDriver: (rideId: string) => Promise<boolean>;
  updateDriverRideStage: (nextStatus: TripStatus, coords?: LatLng) => Promise<void>;

  // History, Favorites, Safety & Promos (Strictly DB-backed, empty by default)
  trips: TripRecord[];
  favorites: PlaceLocation[];
  promos: PromoCode[];
  emergencyContacts: EmergencyContact[];
  addFavorite: (place: PlaceLocation) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  rebookTrip: (trip: TripRecord) => void;
}

export const useRydeStore = create<RydeState>((set, get) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
  isLiveBackend: isSupabaseConfigured,

  isAuthenticated: false,
  authLoading: false,
  oauthProviderLoading: null,
  hydrating: false,
  pendingPhone: '',
  user: EMPTY_USER,
  driverVehicle: null,
  walletTransactions: [],

  setPendingPhone: (pendingPhone) => set({ pendingPhone }),

  resetUserState: () =>
    set({
      isAuthenticated: false,
      pendingPhone: '',
      user: EMPTY_USER,
      driverVehicle: null,
      walletTransactions: [],
      destination: null,
      routeGeometry: null,
      paymentReference: '',
      appliedPromo: null,
      activeRide: null,
      tripStatus: 'idle',
      assignedDriver: UNASSIGNED_DRIVER,
      driverEtaMin: 0,
      driverCoords: null,
      chatMessages: [],
      openRequests: [],
      driverActiveRide: null,
      trips: [],
      favorites: [],
      promos: [],
      emergencyContacts: [],
    }),

  hydrateFromSupabase: async () => {
    if (!supabase) return false;
    set({ hydrating: true });
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session ?? null;

      if (!session?.user) {
        get().resetUserState();
        set({ hydrating: false });
        return false;
      }

      const uid = session.user.id;
      const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
      const oauthFullName =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        (typeof meta.name === 'string' && meta.name.trim()) ||
        '';
      const [oauthFirst, ...oauthRest] = oauthFullName.split(/\s+/).filter(Boolean);
      const oauthLast = oauthRest.join(' ');

      // Clear any stale in-memory state from a prior user before populating
      const [profile, vehicle, favs, contacts, promos, txs, trips] =
        await Promise.all([
          fetchUserProfile(uid),
          fetchOwnDriverVehicle(uid),
          fetchFavoritePlaces(uid),
          fetchEmergencyContacts(uid),
          fetchActivePromos(),
          fetchWalletTransactions(uid),
          fetchUserTrips(uid),
        ]);

      const resolvedUser: UserProfile = profile ?? {
        id: uid,
        email: session.user.email ?? '',
        firstName:
          (typeof meta.first_name === 'string' && meta.first_name.trim()) ||
          (typeof meta.given_name === 'string' && meta.given_name.trim()) ||
          oauthFirst ||
          '',
        middleName: typeof meta.middle_name === 'string' ? meta.middle_name : '',
        lastName:
          (typeof meta.last_name === 'string' && meta.last_name.trim()) ||
          (typeof meta.family_name === 'string' && meta.family_name.trim()) ||
          oauthLast ||
          '',
        phone: typeof meta.phone === 'string' ? meta.phone : '',
        rating: 0,
        walletBalance: 0,
        totalTrips: 0,
        role: 'rider',
      };

      // Strictly bind to database results — NEVER fall back to preset mock arrays
      set({
        isAuthenticated: true,
        hydrating: false,
        user: resolvedUser,
        driverVehicle: vehicle,
        favorites: favs,
        emergencyContacts: contacts,
        promos,
        walletTransactions: txs,
        trips,
        destination: null,
        routeGeometry: null,
        appliedPromo: null,
        activeRide: null,
        driverActiveRide: null,
        tripStatus: 'idle',
        assignedDriver: UNASSIGNED_DRIVER,
        chatMessages: [],
      });
      return true;
    } catch {
      set({ hydrating: false });
      return false;
    }
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) {
      return 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.';
    }
    set({ authLoading: true });
    try {
      get().resetUserState();
      await clearAnyLegacyLocalCache();

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
      return 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.';
    }
    set({ authLoading: true });
    try {
      get().resetUserState();
      await clearAnyLegacyLocalCache();

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

  signInWithOAuth: async (provider) => {
    if (!supabase) {
      return 'Authentication service is not configured yet.';
    }
    set({ oauthProviderLoading: provider });
    try {
      get().resetUserState();
      await clearAnyLegacyLocalCache();

      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : AuthSession.makeRedirectUri({
              scheme: 'ryde',
              path: 'auth/callback',
            });

      const providerQueryParams: Record<string, string> | undefined =
        provider === 'google'
          ? { access_type: 'offline', prompt: 'select_account' }
          : undefined;

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            queryParams: providerQueryParams,
          },
        });
        if (error) {
          set({ oauthProviderLoading: null });
          return error.message;
        }
        // Browser will redirect to provider; keep loading indicator active
        return null;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: providerQueryParams,
        },
      });

      if (error || !data?.url) {
        set({ oauthProviderLoading: null });
        return error?.message ?? `Unable to start ${provider} sign-in.`;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        set({ oauthProviderLoading: null });
        return '__CANCELLED__';
      }

      if (result.type !== 'success' || !result.url) {
        set({ oauthProviderLoading: null });
        return `Unable to complete ${provider} sign-in.`;
      }

      const parsed = new URL(result.url);
      const errorDesc =
        parsed.searchParams.get('error_description') ||
        parsed.searchParams.get('error');
      if (errorDesc) {
        set({ oauthProviderLoading: null });
        return decodeURIComponent(errorDesc);
      }

      const code = parsed.searchParams.get('code');
      if (code) {
        const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchError) {
          set({ oauthProviderLoading: null });
          return exchError.message;
        }
      } else if (parsed.hash) {
        const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessErr) {
            set({ oauthProviderLoading: null });
            return sessErr.message;
          }
        } else {
          set({ oauthProviderLoading: null });
          return 'Missing authentication session from redirect.';
        }
      } else {
        set({ oauthProviderLoading: null });
        return 'Authentication did not return a valid session.';
      }

      await get().hydrateFromSupabase();
      set({ oauthProviderLoading: null });
      return null;
    } catch (e) {
      set({ oauthProviderLoading: null });
      return e instanceof Error ? e.message : `Unable to continue with ${provider}`;
    }
  },

  completeAuth: (firstName, middleName, lastName) => {
    const state = get();
    const updatedPhone = state.pendingPhone.trim()
      ? `+63 ${state.pendingPhone.trim()}`
      : state.user.phone;

    if (supabase && state.user.id) {
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
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        phone: updatedPhone,
      },
    });
  },

  quickDemoSignIn: () => {
    get().resetUserState();
    set({
      isAuthenticated: true,
      user: {
        ...EMPTY_USER,
        id: 'guest-preview',
        firstName: 'Guest',
        lastName: 'Rider',
      },
    });
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    await clearAnyLegacyLocalCache();
    get().resetUserState();
  },

  topUpWallet: async (amount, method = 'gcash', reference = null) => {
    const state = get();
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
  pickup: DEFAULT_PICKUP,
  destination: null,
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
    if (get().destination) {
      get().refreshRoute().catch(() => {});
    }
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
      if (get().destination) {
        get().refreshRoute().catch(() => {});
      }
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
  assignedDriver: UNASSIGNED_DRIVER,
  driverEtaMin: 0,
  driverCoords: null,
  chatMessages: [],

  startRideRequest: async () => {
    const state = get();
    const dest = state.destination;
    if (!dest) return null;

    const tier =
      RIDE_TIERS.find((t) => t.id === state.selectedTierId) ?? RIDE_TIERS[1]!;
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

    let createdRide: LiveRide | null = null;
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
      assignedDriver: UNASSIGNED_DRIVER,
      driverEtaMin: tier.etaMinutes,
      driverCoords: null,
      chatMessages: [],
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
      chatMessages: msgs,
    });
  },

  appendRealtimeMessage: (msg) =>
    set((state) => {
      if (state.chatMessages.some((m) => m.id === msg.id)) return state;
      return { chatMessages: [...state.chatMessages, msg] };
    }),

  assignDriver: () => {
    const { pickup, destination, selectedTierId } = get();
    const tier =
      RIDE_TIERS.find((t) => t.id === selectedTierId) ?? RIDE_TIERS[1]!;
    set({
      tripStatus: 'accepted',
      driverEtaMin: tier.etaMinutes,
      assignedDriver: {
        id: 'simulated-driver',
        name: 'Simulated Driver',
        initials: 'SD',
        rating: 5.0,
        tripsCompleted: 1,
        vehicleModel: tier.name,
        vehicleColor: '',
        plateNumber: 'TEST 001',
        phone: '',
        verified: true,
      },
      driverCoords: destination
        ? {
            lat: pickup.lat + (destination.lat - pickup.lat) * 0.25,
            lng: pickup.lng + (destination.lng - pickup.lng) * 0.25,
          }
        : { lat: pickup.lat, lng: pickup.lng },
    });
  },

  advanceTripPhase: async () => {
    const state = get();
    const nextStatus: TripStatus =
      state.tripStatus === 'accepted' || state.tripStatus === 'arrived'
        ? 'in_trip'
        : 'completed';
    if (
      state.activeRide &&
      supabase &&
      state.user.id &&
      state.user.id !== 'guest-preview'
    ) {
      await updateRideStatus(state.activeRide.id, nextStatus);
    }
    set({
      tripStatus: nextStatus,
      driverEtaMin:
        nextStatus === 'in_trip' ? state.routeGeometry?.durationMin ?? 6 : 0,
    });
  },

  cancelActiveTrip: async () => {
    const { activeRide, user } = get();
    if (activeRide && supabase && user.id && user.id !== 'guest-preview') {
      await updateRideStatus(activeRide.id, 'cancelled');
    }
    set({
      tripStatus: 'idle',
      activeRide: null,
      assignedDriver: UNASSIGNED_DRIVER,
      chatMessages: [],
    });
  },

  sendChatMessage: async (text, role = 'rider') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const state = get();
    const targetRide =
      role === 'driver' ? state.driverActiveRide : state.activeRide;
    if (
      targetRide &&
      supabase &&
      state.user.id &&
      state.user.id !== 'guest-preview'
    ) {
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
    const dest = state.destination;

    if (
      state.activeRide &&
      supabase &&
      state.user.id &&
      state.user.id !== 'guest-preview'
    ) {
      await completeRidePaymentRpc(state.activeRide.id, rating, tipAmount);
      await get().hydrateFromSupabase();
      return;
    }

    if (!dest) {
      set({ activeRide: null, tripStatus: 'idle' });
      return;
    }

    const fare = calculateTierFare(
      tier,
      state.pickup,
      dest,
      state.appliedPromo?.discountAmount ?? 0,
      state.routeGeometry?.distanceKm
    );

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
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
      vehicleModel: '',
      vehicleColor: '',
      plateNumber: '',
      tierId: 'economy',
      isOnline: online,
      currentLat: gps?.lat ?? DEFAULT_CENTER.lat,
      currentLng: gps?.lng ?? DEFAULT_CENTER.lng,
      totalEarnings: 0,
      verified: true,
    };
    const next: DriverVehicleProfile = {
      ...base,
      isOnline: online,
      currentLat: gps?.lat ?? base.currentLat,
      currentLng: gps?.lng ?? base.currentLng,
    };
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
    const lat = state.driverVehicle?.currentLat ?? DEFAULT_CENTER.lat;
    const lng = state.driverVehicle?.currentLng ?? DEFAULT_CENTER.lng;
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
      driverActiveRide: {
        ...found,
        status: 'accepted',
        driverId: state.user.id,
      },
      openRequests: state.openRequests.filter((r) => r.id !== rideId),
    });
    return true;
  },

  updateDriverRideStage: async (nextStatus, coords) => {
    const state = get();
    const active = state.driverActiveRide;
    if (!active) return;
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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

  // Strictly empty until fetched from Supabase for the authenticated user
  trips: [],
  favorites: [],
  promos: [],
  emergencyContacts: [],

  addFavorite: async (place) => {
    const state = get();
    if (state.favorites.some((f) => f.name === place.name)) return;
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
      await deleteFavoritePlaceApi(id);
    }
    set({ favorites: state.favorites.filter((f) => f.id !== id) });
  },

  addEmergencyContact: async (contact) => {
    const state = get();
    if (supabase && state.user.id && state.user.id !== 'guest-preview') {
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
