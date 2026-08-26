-- Full wipe: every login + all related BloodNearby data.
-- Keeps schema, RLS, auth providers, and UI the same.
-- Run once in Supabase → SQL Editor → Run.

-- 1) Live matching + requests
delete from public.request_assignments;
delete from public.blood_requests;

-- 2) Profiles
delete from public.donor_profiles;
delete from public.ngo_profiles;
delete from public.profiles;

-- 3) Uploaded voice notes
delete from storage.objects
where bucket_id = 'request-voice-notes';

-- 4) Auth accounts (Google logins, sessions, identities)
-- Cascades to any remaining auth-linked rows.
delete from auth.users;

notify pgrst, 'reload schema';
