import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Server-only client for webhooks and escalation (bypasses RLS when service role is set). */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  const { url } = getSupabaseEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
