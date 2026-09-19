-- BloodKit schema sync (idempotent — safe to re-run)
-- Run the FULL file in Supabase → SQL Editor after pulling app updates.
-- Individual files (donor-telegram.sql, emergency-escalation.sql, etc.) are slices of this.

-- ---------------------------------------------------------------------------
-- donor_profiles
-- ---------------------------------------------------------------------------
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
  telegram_chat_id text,
  telegram_username text,
  lat double precision,
  lng double precision,
  emergency_voice_calls boolean not null default false,
  phone_verified boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.donor_profiles add column if not exists telegram_chat_id text;
alter table public.donor_profiles add column if not exists telegram_username text;
alter table public.donor_profiles add column if not exists lat double precision;
alter table public.donor_profiles add column if not exists lng double precision;
alter table public.donor_profiles
  add column if not exists emergency_voice_calls boolean not null default false;
alter table public.donor_profiles
  add column if not exists phone_verified boolean not null default false;

alter table public.donor_profiles enable row level security;

drop policy if exists "Donor profiles are viewable by everyone" on public.donor_profiles;
create policy "Donor profiles are viewable by everyone"
  on public.donor_profiles for select using (true);

drop policy if exists "Users can insert own donor profile" on public.donor_profiles;
create policy "Users can insert own donor profile"
  on public.donor_profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own donor profile" on public.donor_profiles;
create policy "Users can update own donor profile"
  on public.donor_profiles for update using (auth.uid() = id);

grant select on public.donor_profiles to anon, authenticated;
grant insert, update on public.donor_profiles to authenticated;

create unique index if not exists donor_profiles_telegram_chat_id_uidx
  on public.donor_profiles (telegram_chat_id)
  where telegram_chat_id is not null;

create or replace function public.link_donor_telegram(
  p_donor_id uuid,
  p_chat_id text,
  p_username text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_donor_id is null or p_chat_id is null or length(trim(p_chat_id)) = 0 then
    raise exception 'donor id and chat id are required';
  end if;

  update public.donor_profiles
  set
    telegram_chat_id = trim(p_chat_id),
    telegram_username = nullif(trim(coalesce(p_username, '')), ''),
    updated_at = now()
  where id = p_donor_id;

  if not found then
    raise exception 'donor profile not found — register as a donor first';
  end if;
end;
$$;

revoke all on function public.link_donor_telegram(uuid, text, text) from public;
grant execute on function public.link_donor_telegram(uuid, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- blood_requests
-- ---------------------------------------------------------------------------
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
  voice_note_url text,
  patients_count integer not null default 1,
  blood_groups text[] not null default '{}',
  group_units jsonb not null default '{}'::jsonb,
  status text not null default 'matching',
  distance_km numeric,
  hospital_lat double precision,
  hospital_lng double precision,
  verification_status text not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.blood_requests add column if not exists voice_note_url text;
alter table public.blood_requests
  add column if not exists patients_count integer not null default 1;
alter table public.blood_requests
  add column if not exists blood_groups text[] not null default '{}';
alter table public.blood_requests
  add column if not exists group_units jsonb not null default '{}'::jsonb;
alter table public.blood_requests add column if not exists hospital_lat double precision;
alter table public.blood_requests add column if not exists hospital_lng double precision;
alter table public.blood_requests
  add column if not exists verification_status text not null default 'pending';
alter table public.blood_requests add column if not exists verified_at timestamptz;
alter table public.blood_requests
  add column if not exists verified_by uuid references auth.users (id) on delete set null;

create index if not exists blood_requests_created_at_idx
  on public.blood_requests (created_at desc);
create index if not exists blood_requests_urgency_idx
  on public.blood_requests (urgency);

alter table public.blood_requests enable row level security;

drop policy if exists "Blood requests are viewable by everyone" on public.blood_requests;
create policy "Blood requests are viewable by everyone"
  on public.blood_requests for select using (true);

drop policy if exists "Authenticated users can create blood requests" on public.blood_requests;
create policy "Authenticated users can create blood requests"
  on public.blood_requests for insert
  with check (auth.uid() = user_id or auth.uid() is not null);

drop policy if exists "Owners can update their blood requests" on public.blood_requests;
create policy "Owners can update their blood requests"
  on public.blood_requests for update using (auth.uid() = user_id);

grant select on public.blood_requests to anon, authenticated;
grant insert, update on public.blood_requests to authenticated;

-- ---------------------------------------------------------------------------
-- request_assignments
-- ---------------------------------------------------------------------------
create table if not exists public.request_assignments (
  request_id uuid primary key references public.blood_requests (id) on delete cascade,
  donor_id uuid,
  donor_name text,
  blood_group text,
  donations_completed integer not null default 0,
  distance_km numeric,
  status text not null default 'pending',
  assigned_at timestamptz not null default now(),
  expires_at timestamptz not null default now(),
  declined_donor_ids text[] not null default '{}',
  eligible_donor_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.request_assignments
  add column if not exists eligible_donor_ids text[] not null default '{}';

alter table public.request_assignments enable row level security;

drop policy if exists "Assignments are viewable by everyone" on public.request_assignments;
create policy "Assignments are viewable by everyone"
  on public.request_assignments for select using (true);

drop policy if exists "Authenticated users can write assignments" on public.request_assignments;
create policy "Authenticated users can write assignments"
  on public.request_assignments for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update assignments" on public.request_assignments;
create policy "Authenticated users can update assignments"
  on public.request_assignments for update using (auth.uid() is not null);

grant select on public.request_assignments to anon, authenticated;
grant insert, update on public.request_assignments to authenticated;

-- ---------------------------------------------------------------------------
-- emergency escalation
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_escalations (
  request_id uuid primary key references public.blood_requests (id) on delete cascade,
  severity text not null,
  verification_status text not null,
  escalation_status text not null default 'idle',
  current_donor_id uuid references auth.users (id) on delete set null,
  current_attempt_id uuid,
  donors_called_count integer not null default 0,
  responses_count integer not null default 0,
  max_donors_to_call integer not null default 5,
  lock_token uuid,
  locked_until timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_call_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests (id) on delete cascade,
  donor_id uuid not null references auth.users (id) on delete cascade,
  provider_call_sid text,
  attempt_number integer not null default 1,
  status text not null default 'QUEUED',
  response text,
  failure_reason text,
  initiated_at timestamptz not null default now(),
  answered_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists emergency_call_attempts_request_idx
  on public.emergency_call_attempts (request_id, initiated_at desc);

create unique index if not exists emergency_one_active_call_per_request
  on public.emergency_call_attempts (request_id)
  where status in ('QUEUED', 'CALLING');

alter table public.emergency_escalations enable row level security;
alter table public.emergency_call_attempts enable row level security;

drop policy if exists "Escalation status readable" on public.emergency_escalations;
create policy "Escalation status readable"
  on public.emergency_escalations for select using (true);

drop policy if exists "Call attempts readable" on public.emergency_call_attempts;
create policy "Call attempts readable"
  on public.emergency_call_attempts for select using (true);

grant select on public.emergency_escalations to anon, authenticated;
grant select on public.emergency_call_attempts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime publication (ignore if already added)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.blood_requests;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.donor_profiles;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.request_assignments;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
