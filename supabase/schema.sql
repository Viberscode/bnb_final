-- BloodKit Supabase schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

-- Profiles (linked to auth.users / Google login)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Donor dashboards
create table if not exists public.donor_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  blood_group text not null,
  phone text not null,
  email text,
  city text not null,
  area text not null,
  available boolean not null default true,
  last_donation date,
  age integer,
  notes text,
  donations_completed integer not null default 0,
  trust_score integer not null default 72,
  lives_helped integer not null default 0,
  avg_response_minutes integer not null default 14,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Live blood requests (realtime)
create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  blood_group text not null,
  urgency text not null check (urgency in ('critical', 'urgent', 'planned')),
  hospital_id text not null,
  hospital_name text not null,
  hospital_area text not null,
  contact_name text not null,
  phone text not null default '',
  units integer not null default 1,
  notes text,
  status text not null default 'matching',
  distance_km numeric,
  created_at timestamptz not null default now()
);

create index if not exists blood_requests_created_at_idx
  on public.blood_requests (created_at desc);

create index if not exists blood_requests_urgency_idx
  on public.blood_requests (urgency);

-- Auto-create profile row when a Google user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.donor_profiles enable row level security;
alter table public.blood_requests enable row level security;

-- Profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Donor profiles
create policy "Donor profiles are viewable by everyone"
  on public.donor_profiles for select using (true);
create policy "Users can insert own donor profile"
  on public.donor_profiles for insert with check (auth.uid() = id);
create policy "Users can update own donor profile"
  on public.donor_profiles for update using (auth.uid() = id);

-- Blood requests: public read, authenticated write
create policy "Blood requests are viewable by everyone"
  on public.blood_requests for select using (true);
create policy "Authenticated users can create blood requests"
  on public.blood_requests for insert
  with check (auth.uid() = user_id or auth.uid() is not null);
create policy "Owners can update their blood requests"
  on public.blood_requests for update using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.blood_requests;
alter publication supabase_realtime add table public.donor_profiles;
