# Ryde. — iOS 26 Liquid Glass Mobile App (React Native + Expo)

Production-ready cross-platform **iOS & Android** ride-hailing application designed to **Apple iOS 26 "Liquid Glass" & Human Interface Guidelines** standards and built with **React Native, Expo Router, TypeScript (strict mode), Reanimated, and `@gorhom/bottom-sheet`**.

## Key Features
- **iOS 26 Liquid Glass Design System**: Translucent `expo-blur` surfaces (`GlassSurface`), subtle 1px specular borders, `borderCurve: 'continuous'` squircle geometry, floating capsule tab bar (`FloatingTabBar`), and real-time **System / Light / Dark** appearance switching.
- **Complete End-to-End Flows**:
  - **Onboarding & Auth**: Brand Splash, Philippine `+63` Phone Login, 6-digit OTP Verification with live countdown, and Profile Setup.
  - **Booking & Map**: Interactive Baybay / Visayas State University (VSU) stylized vector map, multi-detent `@gorhom/bottom-sheet`, service selector (`Motor`, `Taxi`, `Food`, `Services`), dual-stop Location Search & Tap-to-Pin mode, Ride Tier Comparison (`Ryde Motor`, `Ryde Economy`, `Ryde Comfort`, `Ryde XL`) with `tabular-nums` fares, and Payment (`GCash`, `Cash`, `Bank Transfer`, `Apple Pay`) & Pickup Schedule modal.
  - **Live Ride & Checkout**: Animated concentric radar driver matching, Live Ride Tracking with moving driver marker, in-app Driver Chat modal, Share Trip, Safety SOS Center, itemized Receipt, 5-star Driver Rating, and Tip selector.
  - **Activity, Favorites & Profile**: Filterable Activity history with one-tap Rebook & receipt viewer, Saved Places & Favorite Drivers, Ryde Wallet with instant top-up, Promo Vouchers (`VSUFREE20`, `RYDE26`), and Safety Contacts.

## Running Locally
```bash
npm install
npm run typecheck
npx expo start
```
Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code in Expo Go.
