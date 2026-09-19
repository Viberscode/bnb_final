-- Included in supabase/migrate.sql (run migrate.sql for full sync).
alter table public.donor_profiles add column if not exists lat double precision;
alter table public.donor_profiles add column if not exists lng double precision;

notify pgrst, 'reload schema';
