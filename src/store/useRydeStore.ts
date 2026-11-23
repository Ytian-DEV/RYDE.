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
import {
  ChatMessage,
  DriverProfile,
  EmergencyContact,
  PaymentMethodId,
  PlaceLocation,
  PromoCode,
  RideTierId,
  ScheduleOptionId,
  ServiceCategory,
  ThemeMode,
  TripRecord,
  TripStatus,
  UserProfile,
} from '@/types';

interface RydeState {
  // Appearance
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Auth & User
  isAuthenticated: boolean;
  pendingPhone: string;
  user: UserProfile;
  setPendingPhone: (phone: string) => void;
  completeAuth: (firstName: string, middleName: string, lastName: string) => void;
  quickDemoSignIn: () => void;
  signOut: () => void;
  topUpWallet: (amount: number) => void;

  // Booking Flow
  selectedService: ServiceCategory;
  pickup: PlaceLocation;
  destination: PlaceLocation | null;
  selectedTierId: RideTierId;
  selectedPayment: PaymentMethodId;
  scheduleOption: ScheduleOptionId;
  scheduledTimeLabel: string;
  appliedPromo: PromoCode | null;

  setSelectedService: (service: ServiceCategory) => void;
  setPickup: (place: PlaceLocation) => void;
  setDestination: (place: PlaceLocation | null) => void;
  swapStops: () => void;
  setSelectedTierId: (tierId: RideTierId) => void;
  setSelectedPayment: (payment: PaymentMethodId) => void;
  setScheduleOption: (opt: ScheduleOptionId, label: string) => void;
  applyPromo: (promo: PromoCode | null) => void;

  // Active Trip
  tripStatus: TripStatus;
  assignedDriver: DriverProfile;
  driverEtaMin: number;
  tripProgress: number; // 0 -> 1
  chatMessages: ChatMessage[];
  startRideRequest: () => void;
  assignDriver: () => void;
  advanceTripPhase: () => void;
  cancelActiveTrip: () => void;
  sendChatMessage: (text: string) => void;
  completeTripAndRate: (rating: number, tipAmount: number) => void;

  // History, Favorites, Safety & Promos
  trips: TripRecord[];
  favorites: PlaceLocation[];
  promos: PromoCode[];
  emergencyContacts: EmergencyContact[];
  addFavorite: (place: PlaceLocation) => void;
  removeFavorite: (id: string) => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  rebookTrip: (trip: TripRecord) => void;
}

const DEFAULT_USER: UserProfile = {
  firstName: 'Chris',
  middleName: '',
  lastName: 'Mendoza',
  phone: '+63 917 482 1094',
  rating: 4.95,
  walletBalance: 420.0,
  totalTrips: 42,
};

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'driver',
    text: 'Maayong adlaw! On my way to 7/11 Utod now, about 3 mins away.',
    timestamp: 'Just now',
  },
];

export const useRydeStore = create<RydeState>((set, get) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),

  isAuthenticated: false,
  pendingPhone: '917 482 1094',
  user: DEFAULT_USER,

  setPendingPhone: (pendingPhone) => set({ pendingPhone }),

  completeAuth: (firstName, middleName, lastName) =>
    set((state) => ({
      isAuthenticated: true,
      user: {
        ...state.user,
        firstName: firstName.trim() || 'Chris',
        middleName: middleName.trim(),
        lastName: lastName.trim() || 'Mendoza',
        phone: `+63 ${state.pendingPhone.trim() || '917 482 1094'}`,
      },
    })),

  quickDemoSignIn: () =>
    set({
      isAuthenticated: true,
      user: DEFAULT_USER,
    }),

  signOut: () =>
    set({
      isAuthenticated: false,
      tripStatus: 'idle',
    }),

  topUpWallet: (amount) =>
    set((state) => ({
      user: {
        ...state.user,
        walletBalance: state.user.walletBalance + amount,
      },
    })),

  selectedService: 'motor',
  pickup: BAYBAY_PLACES[0]!, // 7/11 Utod, 6521
  destination: BAYBAY_PLACES[1]!, // DCST, Visayas State University
  selectedTierId: 'economy',
  selectedPayment: 'gcash',
  scheduleOption: 'now',
  scheduledTimeLabel: 'Leave Now',
  appliedPromo: null,

  setSelectedService: (selectedService) => {
    const mappedTier: RideTierId =
      selectedService === 'motor'
        ? 'motor'
        : selectedService === 'taxi'
          ? 'economy'
          : 'economy';
    set({ selectedService, selectedTierId: mappedTier });
  },

  setPickup: (pickup) => set({ pickup }),
  setDestination: (destination) => set({ destination }),

  swapStops: () =>
    set((state) => {
      if (!state.destination) return state;
      return {
        pickup: state.destination,
        destination: state.pickup,
      };
    }),

  setSelectedTierId: (selectedTierId) => set({ selectedTierId }),
  setSelectedPayment: (selectedPayment) => set({ selectedPayment }),
  setScheduleOption: (scheduleOption, scheduledTimeLabel) =>
    set({ scheduleOption, scheduledTimeLabel }),
  applyPromo: (appliedPromo) => set({ appliedPromo }),

  tripStatus: 'idle',
  assignedDriver: SAMPLE_DRIVERS[0]!,
  driverEtaMin: 3,
  tripProgress: 0.15,
  chatMessages: INITIAL_CHAT,

  startRideRequest: () => {
    const tierId = get().selectedTierId;
    const driver =
      tierId === 'motor'
        ? SAMPLE_DRIVERS[1]!
        : tierId === 'xl'
          ? SAMPLE_DRIVERS[2]!
          : SAMPLE_DRIVERS[0]!;
    set({
      tripStatus: 'matching',
      assignedDriver: driver,
      driverEtaMin: tierId === 'motor' ? 2 : 3,
      tripProgress: 0.1,
      chatMessages: [
        {
          id: 'msg-init',
          sender: 'driver',
          text: `Hi ${get().user.firstName}! I’m heading to ${get().pickup.name} now.`,
          timestamp: 'Just now',
        },
      ],
    });
  },

  assignDriver: () =>
    set({
      tripStatus: 'arriving',
      driverEtaMin: 3,
      tripProgress: 0.35,
    }),

  advanceTripPhase: () =>
    set((state) => {
      if (state.tripStatus === 'arriving') {
        return {
          tripStatus: 'in_trip',
          driverEtaMin: 6,
          tripProgress: 0.68,
        };
      }
      return {
        tripStatus: 'completed',
        driverEtaMin: 0,
        tripProgress: 1,
      };
    }),

  cancelActiveTrip: () =>
    set({
      tripStatus: 'idle',
      tripProgress: 0,
    }),

  sendChatMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nowLabel = 'Now';
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: `msg-${Date.now()}`,
          sender: 'rider',
          text: trimmed,
          timestamp: nowLabel,
        },
      ],
    }));
  },

  completeTripAndRate: (rating, tipAmount) => {
    const state = get();
    const tier =
      RIDE_TIERS.find((t) => t.id === state.selectedTierId) ?? RIDE_TIERS[1]!;
    const dest = state.destination ?? BAYBAY_PLACES[1]!;
    const fare = calculateTierFare(
      tier,
      state.pickup,
      dest,
      state.appliedPromo?.discountAmount ?? 0
    );

    const newRecord: TripRecord = {
      id: `trip-${Date.now()}`,
      category: state.selectedService,
      pickup: state.pickup,
      destination: dest,
      tierName: tier.name,
      driver: state.assignedDriver,
      paymentMethod: state.selectedPayment,
      baseFare: fare.baseFare,
      distanceFare: fare.distanceFare,
      bookingFee: 0,
      tipAmount,
      totalFare: fare.totalFare + tipAmount,
      distanceKm: fare.distanceKm,
      durationMin: Math.max(5, Math.round(fare.distanceKm * 2.5)),
      dateLabel: 'Just now',
      status: 'Completed',
      ratingGiven: rating,
    };

    const nextBalance =
      state.selectedPayment === 'gcash'
        ? Math.max(0, state.user.walletBalance - newRecord.totalFare)
        : state.user.walletBalance;

    set({
      trips: [newRecord, ...state.trips],
      tripStatus: 'idle',
      appliedPromo: null,
      user: {
        ...state.user,
        totalTrips: state.user.totalTrips + 1,
        walletBalance: nextBalance,
      },
    });
  },

  trips: INITIAL_TRIPS,
  favorites: [
    BAYBAY_PLACES[3]!, // Home
    BAYBAY_PLACES[1]!, // VSU Campus DCST
    BAYBAY_PLACES[0]!, // 7/11 Utod
    BAYBAY_PLACES[6]!, // Baybay Baywalk
  ],
  promos: INITIAL_PROMOS,
  emergencyContacts: INITIAL_CONTACTS,

  addFavorite: (place) =>
    set((state) => {
      if (state.favorites.some((f) => f.id === place.id)) return state;
      return { favorites: [place, ...state.favorites] };
    }),

  removeFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.id !== id),
    })),

  addEmergencyContact: (contact) =>
    set((state) => ({
      emergencyContacts: [
        ...state.emergencyContacts,
        { ...contact, id: `em-${Date.now()}` },
      ],
    })),

  rebookTrip: (trip) =>
    set({
      selectedService: trip.category,
      pickup: trip.pickup,
      destination: trip.destination,
      selectedPayment: trip.paymentMethod,
    }),
}));
