-- Wipe test live requests and donor profiles.
-- Run in Supabase Dashboard → SQL Editor.

delete from public.request_assignments;
delete from public.blood_requests;
delete from public.donor_profiles;
