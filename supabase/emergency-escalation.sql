-- Escalated Emergency Calling (run in Supabase SQL Editor)

alter table public.blood_requests
  add column if not exists verification_status text not null default 'pending';

alter table public.blood_requests
  add column if not exists verified_at timestamptz;

alter table public.blood_requests
  add column if not exists verified_by uuid references auth.users (id) on delete set null;

alter table public.donor_profiles
  add column if not exists emergency_voice_calls boolean not null default false;

alter table public.donor_profiles
  add column if not exists phone_verified boolean not null default false;

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
