import type { BloodGroup, DonorProfile } from "@/types";
import { createdAfterReset } from "@/lib/data-reset";
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
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
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
    telegramChatId: row.telegram_chat_id ?? undefined,
    telegramUsername: row.telegram_username ?? undefined,
  };
}

export async function fetchAvailableDonors(): Promise<DonorProfile[]> {
  return (await fetchRegisteredDonors()).filter((donor) => donor.available);
}

/** Every registered donor, including those currently offline. */
export async function fetchRegisteredDonors(): Promise<DonorProfile[]> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.from("donor_profiles").select("*");

  if (error || !data?.length) {
    return [];
  }

  return (data as DonorRow[])
    .map(mapRow)
    .filter((donor) => createdAfterReset(donor.joinedAt));
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
  const profile = mapRow(data as DonorRow);
  return createdAfterReset(profile.joinedAt) ? profile : null;
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

  const { data: existingRow } = await supabase
    .from("donor_profiles")
    .select(
      "joined_at, donations_completed, trust_score, lives_helped, avg_response_minutes",
    )
    .eq("id", user.id)
    .maybeSingle();
  const existing = existingRow as
    | {
        joined_at?: string;
        donations_completed?: number;
        trust_score?: number;
        lives_helped?: number;
        avg_response_minutes?: number;
      }
    | null;
  const joinedAt = createdAfterReset(existing?.joined_at)
    ? existing!.joined_at!
    : new Date().toISOString();

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
    donations_completed: input.donationsCompleted ?? existing?.donations_completed ?? 0,
    trust_score: input.trustScore ?? existing?.trust_score ?? 72,
    lives_helped: input.livesHelped ?? existing?.lives_helped ?? 0,
    avg_response_minutes:
      input.avgResponseMinutes ?? existing?.avg_response_minutes ?? 14,
    joined_at: joinedAt,
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
