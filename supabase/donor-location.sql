-- Donor GPS for matching and maps (run in Supabase SQL Editor if save fails on lat/lng).
alter table public.donor_profiles
  add column if not exists lat double precision;

alter table public.donor_profiles
  add column if not exists lng double precision;
