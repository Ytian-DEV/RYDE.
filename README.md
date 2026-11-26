# Ryde. — Live Supabase + iOS 26 Liquid Glass Ride-Hailing App (Expo SDK 58)

Production-ready cross-platform **iOS, Android & Web** ride-hailing application built with **React Native, Expo SDK 58, Expo Router, TypeScript (strict), Reanimated 4, OpenStreetMap + OSRM routing, and Supabase (Auth, Postgres, RLS, Realtime, Atomic Wallet Ledger)**.

## Live Full-Stack Capabilities
- **Supabase Auth**: Email + Password + Philippine `+63` mobile number registration, persistent sessions (`AsyncStorage`), and automatic `profiles` creation trigger.
- **Real OpenStreetMap + GPS + OSRM Routing (Zero API Keys)**:
  - Live device GPS via `expo-location` with automatic reverse geocoding.
  - Real interactive Leaflet map (CartoDB Voyager light & Dark Matter dark tiles) on iOS, Android, and Web with tap-to-pin anywhere.
  - Live Nominatim place search across Baybay, VSU, and the Philippines + real OSRM road-snapped polylines, road distance (`km`), ETA (`min`), and dynamic Peso fares (`₱`).
- **Rider App + Driver Mode (Supabase Realtime)**:
  - Riders broadcast live ride requests (`public.rides`), track live driver status & GPS coordinates, and chat bidirectionally via Supabase Realtime (`public.ride_messages`).
  - Tap **Switch to Driver Mode** (Profile tab or top-right car icon on Home) to configure your vehicle, go Online, accept incoming requests atomically via Postgres RPC, chat with the rider, and earn trip fares.
- **Supabase Wallet Ledger & Safety**:
  - Atomic `top_up_wallet` and `complete_ride_payment` Postgres RPCs, GCash/InstaPay reference tracking, saved favorite places, promo vouchers (`VSUFREE20`, `RYDE26`, `BAYBAY10`), and trusted SOS contacts.

---

## 3-Step Supabase Setup
1. **Create a free Supabase project** at [supabase.com](https://supabase.com).
2. **Run the database schema**: Open **Supabase Dashboard → SQL Editor → New query**, paste the contents of [supabase/schema.sql](supabase/schema.sql), and click **Run**.
   - *(Tip for fastest testing: in **Authentication → Providers → Email**, disable **Confirm email** so new sign-ups log in immediately.)*
3. **Add your `.env` file**: Copy `.env.example` to `.env` and fill in your credentials from **Project Settings → API**:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

## Running Locally
```bash
npm install --legacy-peer-deps
npx expo start --clear
```
Scan the QR code in **Expo Go (SDK 58)** or press **`w`** to preview in Chrome.
