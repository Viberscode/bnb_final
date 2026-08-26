-- Creates donor_profiles if missing, then adds Telegram linking.
-- Paste ALL of this into Supabase SQL Editor (project: xrsqfnqvjhrkngzeuuua) and Run.

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
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.donor_profiles
  add column if not exists telegram_chat_id text;

alter table public.donor_profiles
  add column if not exists telegram_username text;

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

do $$
begin
  alter publication supabase_realtime add table public.donor_profiles;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
