import type { BloodGroup, DonorProfile } from "@/types";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const DONOR_PROFILE_EVENT = "bloodkit:donor-profile";

type DonorRow = {
  id: string;
  full_name: string;
  blood_group: string;
  phone: string;
  email: string | null;
  city: string;
  area: string;
  available: boolean;
  last_donation: string | null;
  age: number | null;
  notes: string | null;
  donations_completed: number;
  trust_score: number;
  lives_helped: number;
  avg_response_minutes: number;
  joined_at: string;
};

function mapRow(row: DonorRow): DonorProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    bloodGroup: row.blood_group as BloodGroup,
    phone: row.phone,
    email: row.email ?? undefined,
    city: row.city,
    area: row.area,
    available: row.available,
    lastDonation: row.last_donation ?? undefined,
    age: row.age ?? undefined,
    notes: row.notes ?? undefined,
    donationsCompleted: row.donations_completed,
    trustScore: row.trust_score,
    livesHelped: row.lives_helped,
    avgResponseMinutes: row.avg_response_minutes,
    joinedAt: row.joined_at,
  };
}

export async function fetchAvailableDonors(): Promise<DonorProfile[]> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from("donor_profiles")
    .select("*")
    .eq("available", true);

  if (error || !data?.length) {
    return [];
  }

  return (data as DonorRow[]).map(mapRow);
}

export async function fetchDonorProfile(
  userId?: string,
): Promise<DonorProfile | null> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return null;

  let id = userId;
  if (!id) {
    const { data } = await supabase.auth.getUser();
    id = data.user?.id;
  }
  if (!id) return null;

  const { data, error } = await supabase
    .from("donor_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as DonorRow);
}

export async function saveDonorProfile(
  input: Omit<
    DonorProfile,
    | "id"
    | "joinedAt"
    | "donationsCompleted"
    | "trustScore"
    | "livesHelped"
    | "avgResponseMinutes"
  > &
    Partial<
      Pick<
        DonorProfile,
        | "donationsCompleted"
        | "trustScore"
        | "livesHelped"
        | "avgResponseMinutes"
      >
    >,
): Promise<DonorProfile> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add your project keys to save donor profiles.",
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sign in with Google before saving your donor profile.");
  }

  const payload = {
    id: user.id,
    full_name: input.fullName.trim(),
    blood_group: input.bloodGroup,
    phone: input.phone.trim(),
    email: input.email?.trim() || user.email || null,
    city: input.city.trim(),
    area: input.area.trim(),
    available: input.available,
    last_donation: input.lastDonation || null,
    age: input.age ?? null,
    notes: input.notes?.trim() || null,
    donations_completed: input.donationsCompleted ?? 0,
    trust_score: input.trustScore ?? 72,
    lives_helped: input.livesHelped ?? 0,
    avg_response_minutes: input.avgResponseMinutes ?? 14,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("donor_profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save donor profile.");
  }

  return mapRow(data as DonorRow);
}

export async function updateDonorAvailability(
  available: boolean,
): Promise<DonorProfile | null> {
  const existing = await fetchDonorProfile();
  if (!existing) return null;
  return saveDonorProfile({ ...existing, available });
}

export function subscribeDonorProfile(
  userId: string,
  onChange: () => void,
) {
  const supabase = tryCreateClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`donor_profile_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "donor_profiles",
        filter: `id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
