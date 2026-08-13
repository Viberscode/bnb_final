-- Recreate live-request + donor-match tables if they are missing.
-- Run once in Supabase → SQL Editor.

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
  created_at timestamptz not null default now()
);

alter table public.blood_requests
  add column if not exists voice_note_url text;
alter table public.blood_requests
  add column if not exists patients_count integer not null default 1;
alter table public.blood_requests
  add column if not exists blood_groups text[] not null default '{}';
alter table public.blood_requests
  add column if not exists group_units jsonb not null default '{}'::jsonb;

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
  updated_at timestamptz not null default now()
);

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

do $$
begin
  alter publication supabase_realtime add table public.blood_requests;
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
