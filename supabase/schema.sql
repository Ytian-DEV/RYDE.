-- ============================================================================
-- Ryde. — Complete Supabase Postgres Schema, RLS, Realtime & Atomic RPCs
-- Paste this entire file into Supabase Dashboard → SQL Editor → Run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text not null default 'Rider',
  middle_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  rating numeric(3,2) not null default 5.00,
  total_trips integer not null default 0,
  wallet_balance numeric(10,2) not null default 0.00,
  role text not null default 'rider' check (role in ('rider', 'driver', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure existing databases also inherit clean empty/zero defaults on re-run
alter table public.profiles alter column phone set default '';
alter table public.profiles alter column wallet_balance set default 0.00;

-- 2. DRIVER PROFILES
create table if not exists public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_model text not null default 'Toyota Vios',
  vehicle_color text not null default 'Silver',
  plate_number text not null default 'ABC 4821',
  tier_id text not null default 'economy' check (tier_id in ('motor', 'economy', 'comfort', 'xl')),
  is_online boolean not null default false,
  current_lat double precision not null default 10.7445,
  current_lng double precision not null default 124.7945,
  total_earnings numeric(10,2) not null default 0.00,
  verified boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 3. RIDES (Full Realtime Lifecycle)
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  category text not null default 'taxi' check (category in ('motor', 'taxi', 'food', 'services')),
  tier_id text not null default 'economy' check (tier_id in ('motor', 'economy', 'comfort', 'xl')),
  tier_name text not null default 'Ryde Economy',
  status text not null default 'searching' check (
    status in ('searching', 'accepted', 'arrived', 'in_trip', 'completed', 'cancelled')
  ),
  pickup_name text not null,
  pickup_address text not null default '',
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dest_name text not null,
  dest_address text not null default '',
  dest_lat double precision not null,
  dest_lng double precision not null,
  driver_lat double precision,
  driver_lng double precision,
  distance_km numeric(6,2) not null default 2.50,
  duration_min integer not null default 8,
  base_fare numeric(10,2) not null default 40.00,
  distance_fare numeric(10,2) not null default 24.00,
  promo_discount numeric(10,2) not null default 0.00,
  promo_code text,
  tip_amount numeric(10,2) not null default 0.00,
  total_fare numeric(10,2) not null default 64.00,
  payment_method text not null default 'gcash' check (
    payment_method in ('gcash', 'cash', 'bank_transfer', 'apple_pay', 'wallet')
  ),
  payment_reference text,
  scheduled_for text not null default 'Leave Now',
  rating_given integer check (rating_given between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. REALTIME CHAT MESSAGES
create table if not exists public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('rider', 'driver')),
  body text not null,
  created_at timestamptz not null default now()
);

-- 5. WALLET LEDGER TRANSACTIONS
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('top_up', 'ride_payment', 'driver_earning', 'tip', 'refund')),
  amount numeric(10,2) not null,
  payment_method text not null default 'gcash',
  reference_code text,
  description text not null default '',
  ride_id uuid references public.rides(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. FAVORITE PLACES
create table if not exists public.favorite_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  category text not null default 'landmark' check (category in ('home', 'campus', 'store', 'landmark')),
  created_at timestamptz not null default now()
);

-- 7. EMERGENCY CONTACTS
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relation text not null default 'Family',
  phone text not null,
  created_at timestamptz not null default now()
);

-- 8. PROMO CODES
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  discount_amount numeric(10,2) not null,
  expires_at timestamptz not null default (now() + interval '180 days'),
  is_active boolean not null default true
);

insert into public.promo_codes (code, title, discount_amount)
values
  ('VSUFREE20', '₱20 off any VSU Campus ride', 20.00),
  ('RYDE26', '₱15 off Ryde Economy, Comfort & XL', 15.00),
  ('BAYBAY10', '₱10 off Baybay City rides', 10.00)
on conflict (code) do nothing;

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, middle_name, last_name, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), 'Rider'),
    coalesce(new.raw_user_meta_data->>'middle_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'phone', ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- ATOMIC RPC FUNCTIONS (Wallet Top-Up, Accept Ride, Complete Ride Payment)
-- ============================================================================
create or replace function public.top_up_wallet(
  p_amount numeric,
  p_method text default 'gcash',
  p_reference text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 or p_amount > 50000 then
    raise exception 'Invalid top-up amount';
  end if;

  update public.profiles
  set wallet_balance = wallet_balance + p_amount,
      updated_at = now()
  where id = v_uid
  returning wallet_balance into v_balance;

  insert into public.wallet_transactions (user_id, kind, amount, payment_method, reference_code, description)
  values (v_uid, 'top_up', p_amount, p_method, p_reference, 'Wallet Top-Up via ' || upper(p_method));

  return v_balance;
end;
$$;

create or replace function public.accept_ride(
  p_ride_id uuid,
  p_driver_lat double precision default 10.7445,
  p_driver_lng double precision default 124.7945
)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.rides
  set driver_id = v_uid,
      status = 'accepted',
      driver_lat = p_driver_lat,
      driver_lng = p_driver_lng,
      updated_at = now()
  where id = p_ride_id
    and status = 'searching'
    and driver_id is null
  returning * into v_ride;

  if v_ride.id is null then
    raise exception 'Ride is no longer available';
  end if;

  return v_ride;
end;
$$;

create or replace function public.complete_ride_payment(
  p_ride_id uuid,
  p_rating integer default 5,
  p_tip numeric default 0
)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
  v_grand_total numeric;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_ride from public.rides where id = p_ride_id;
  if v_ride.id is null then
    raise exception 'Ride not found';
  end if;

  v_grand_total := v_ride.total_fare + greatest(coalesce(p_tip, 0), 0);

  update public.rides
  set status = 'completed',
      rating_given = coalesce(p_rating, 5),
      tip_amount = greatest(coalesce(p_tip, 0), 0),
      total_fare = v_grand_total,
      updated_at = now()
  where id = p_ride_id
  returning * into v_ride;

  -- Deduct from rider wallet when paid via wallet or gcash demo ledger
  if v_ride.payment_method in ('wallet', 'gcash') then
    update public.profiles
    set wallet_balance = greatest(0, wallet_balance - v_grand_total),
        total_trips = total_trips + 1,
        updated_at = now()
    where id = v_ride.rider_id;

    insert into public.wallet_transactions (user_id, kind, amount, payment_method, reference_code, description, ride_id)
    values (
      v_ride.rider_id,
      'ride_payment',
      -v_grand_total,
      v_ride.payment_method,
      v_ride.payment_reference,
      'Ride to ' || v_ride.dest_name,
      v_ride.id
    );
  else
    update public.profiles
    set total_trips = total_trips + 1,
        updated_at = now()
    where id = v_ride.rider_id;
  end if;

  -- Credit driver earnings if a real driver accepted the ride
  if v_ride.driver_id is not null then
    update public.driver_profiles
    set total_earnings = total_earnings + v_grand_total,
        updated_at = now()
    where user_id = v_ride.driver_id;

    insert into public.wallet_transactions (user_id, kind, amount, payment_method, description, ride_id)
    values (
      v_ride.driver_id,
      'driver_earning',
      v_grand_total,
      v_ride.payment_method,
      'Trip earning: ' || v_ride.dest_name,
      v_ride.id
    );
  end if;

  return v_ride;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_messages enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.favorite_places enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.promo_codes enable row level security;

-- Profiles: read basic public info of riders/drivers, edit only own profile
drop policy if exists "Profiles readable by authenticated users" on public.profiles;
create policy "Profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Driver profiles: readable by authenticated, editable by owner
drop policy if exists "Driver profiles readable by authenticated" on public.driver_profiles;
create policy "Driver profiles readable by authenticated"
  on public.driver_profiles for select to authenticated using (true);
drop policy if exists "Drivers manage own driver profile" on public.driver_profiles;
create policy "Drivers manage own driver profile"
  on public.driver_profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Rides: riders see own rides; online drivers can see searching rides + assigned rides
drop policy if exists "Riders and drivers view relevant rides" on public.rides;
create policy "Riders and drivers view relevant rides"
  on public.rides for select to authenticated
  using (auth.uid() = rider_id or auth.uid() = driver_id or status = 'searching');
drop policy if exists "Riders create own rides" on public.rides;
create policy "Riders create own rides"
  on public.rides for insert to authenticated
  with check (auth.uid() = rider_id);
drop policy if exists "Participants update rides" on public.rides;
create policy "Participants update rides"
  on public.rides for update to authenticated
  using (auth.uid() = rider_id or auth.uid() = driver_id);

-- Ride Messages: participants only
drop policy if exists "Ride participants read messages" on public.ride_messages;
create policy "Ride participants read messages"
  on public.ride_messages for select to authenticated
  using (
    exists (
      select 1 from public.rides r
      where r.id = ride_messages.ride_id
        and (r.rider_id = auth.uid() or r.driver_id = auth.uid())
    )
  );
drop policy if exists "Ride participants insert messages" on public.ride_messages;
create policy "Ride participants insert messages"
  on public.ride_messages for insert to authenticated
  with check (auth.uid() = sender_id);

-- Wallet transactions: owner only
drop policy if exists "Users view own wallet transactions" on public.wallet_transactions;
create policy "Users view own wallet transactions"
  on public.wallet_transactions for select to authenticated using (auth.uid() = user_id);

-- Favorite places: owner only
drop policy if exists "Users manage own favorite places" on public.favorite_places;
create policy "Users manage own favorite places"
  on public.favorite_places for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Emergency contacts: owner only
drop policy if exists "Users manage own emergency contacts" on public.emergency_contacts;
create policy "Users manage own emergency contacts"
  on public.emergency_contacts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Promo codes: readable by authenticated
drop policy if exists "Authenticated users read active promos" on public.promo_codes;
create policy "Authenticated users read active promos"
  on public.promo_codes for select to authenticated using (is_active = true);

-- ============================================================================
-- ENABLE SUPABASE REALTIME FOR LIVE TRACKING & CHAT
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rides'
  ) then
    alter publication supabase_realtime add table public.rides;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ride_messages'
  ) then
    alter publication supabase_realtime add table public.ride_messages;
  end if;
end $$;
