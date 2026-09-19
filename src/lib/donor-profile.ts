import type { BloodGroup, DonorProfile } from "@/types";
import { createdAfterReset } from "@/lib/data-reset";
import {
  AVAILABLE_DONOR_PAGE_SIZE,
  MATCH_DONOR_LIMIT,
  emptyPage,
  pageFromRows,
  type PageResult,
} from "@/lib/pagination";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { computeTrustScore } from "@/lib/trust-score";

export const DONOR_PROFILE_EVENT = "bloodkit:donor-profile";

type DonorRow = {
  id: string;
  full_name: string;
  blood_group: string;
  phone: string;
  email: string | null;
  city: string;
  area: string;
  lat?: number | null;
  lng?: number | null;
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
  emergency_voice_calls?: boolean | null;
  phone_verified?: boolean | null;
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
    lat:
      typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : undefined,
    lng:
      typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : undefined,
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
    emergencyVoiceCalls: row.emergency_voice_calls === true,
    phoneVerified: row.phone_verified !== false,
  };
}

const DONOR_LIST_COLUMNS_BASE =
  "id, full_name, blood_group, phone, email, city, area, available, last_donation, age, notes, donations_completed, trust_score, lives_helped, avg_response_minutes, joined_at, telegram_chat_id, telegram_username";

const DONOR_LIST_COLUMNS_WITH_COORDS = `${DONOR_LIST_COLUMNS_BASE}, lat, lng`;

const DONOR_LIST_COLUMNS_WITH_EMERGENCY = `${DONOR_LIST_COLUMNS_WITH_COORDS}, emergency_voice_calls, phone_verified`;

const DONOR_SELECT_TRIES = [
  DONOR_LIST_COLUMNS_WITH_EMERGENCY,
  DONOR_LIST_COLUMNS_WITH_COORDS,
  DONOR_LIST_COLUMNS_BASE,
];

const DONOR_SINGLE_SELECT_TRIES = [
  `${DONOR_LIST_COLUMNS_WITH_EMERGENCY}, updated_at`,
  `${DONOR_LIST_COLUMNS_WITH_COORDS}, updated_at`,
  `${DONOR_LIST_COLUMNS_BASE}, updated_at`,
];

function isMissingColumnError(error: { message?: string } | null) {
  if (!error?.message) return false;
  return /column|does not exist|42703|schema cache/i.test(error.message);
}

async function selectDonorProfiles<T>(
  run: (columns: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
    count?: number | null;
  }>,
): Promise<{ data: T | null; error: { message: string } | null; count: number | null }> {
  let last: {
    data: T | null;
    error: { message: string } | null;
    count: number | null;
  } = { data: null, error: { message: "select failed" }, count: null };

  for (const columns of DONOR_SELECT_TRIES) {
    const raw = await run(columns);
    last = {
      data: (raw.data as T | null) ?? null,
      error: raw.error,
      count: raw.count ?? null,
    };
    if (!last.error) return last;
    if (!isMissingColumnError(last.error)) return last;
  }
  return last;
}

async function selectDonorProfileRow(
  supabase: QueryClient,
  userId: string,
): Promise<DonorRow | null> {
  for (const columns of DONOR_SINGLE_SELECT_TRIES) {
    const { data, error } = await supabase
      .from("donor_profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) return data as DonorRow;
    if (error && !isMissingColumnError(error)) return null;
  }
  return null;
}

type DonorUpsertPayload = Record<string, unknown>;

function donorUpsertVariants(payload: DonorUpsertPayload): DonorUpsertPayload[] {
  const withoutCoords = { ...payload };
  delete withoutCoords.lat;
  delete withoutCoords.lng;

  const withoutEmergency = { ...payload };
  delete withoutEmergency.emergency_voice_calls;
  delete withoutEmergency.phone_verified;

  const withoutBoth = { ...withoutCoords };
  delete withoutBoth.emergency_voice_calls;
  delete withoutBoth.phone_verified;

  return [payload, withoutCoords, withoutEmergency, withoutBoth];
}

type QueryClient = {
  from: (table: string) => any;
};

export async function queryAvailableDonorPage(
  supabase: QueryClient,
  params: { offset: number; limit: number },
): Promise<PageResult<DonorProfile>> {
  const to = params.offset + params.limit - 1;
  const { data, error, count } = await selectDonorProfiles<DonorRow[]>(
    (columns) =>
      supabase
        .from("donor_profiles")
        .select(columns, { count: "exact" })
        .eq("available", true)
        .order("joined_at", { ascending: false })
        .range(params.offset, to),
  );

  if (error || !data) {
    return emptyPage(params.offset, params.limit);
  }

  const mapped = (data as DonorRow[])
    .map(mapRow)
    .filter((donor) => createdAfterReset(donor.joinedAt));
  return pageFromRows(mapped, params, count ?? null);
}

export async function fetchAvailableDonorsPage(
  offset = 0,
  limit = AVAILABLE_DONOR_PAGE_SIZE,
): Promise<PageResult<DonorProfile>> {
  const params = { offset, limit };
  try {
    const res = await fetch(
      `/api/donors?available=1&offset=${offset}&limit=${limit}`,
      { cache: "no-store", credentials: "include" },
    );
    if (res.ok) {
      const body = (await res.json()) as PageResult<DonorProfile>;
      if (Array.isArray(body.items)) return body;
    }
  } catch {
    /* fall through */
  }

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    return emptyPage(offset, limit);
  }
  return queryAvailableDonorPage(supabase, params);
}

export async function fetchAvailableDonors(): Promise<DonorProfile[]> {
  const page = await fetchAvailableDonorsPage(0, MATCH_DONOR_LIMIT);
  return page.items;
}

/** Every registered donor, including those currently offline — first page only. */
export async function fetchRegisteredDonors(): Promise<DonorProfile[]> {
  const page = await fetchAvailableDonorsPage(0, MATCH_DONOR_LIMIT);
  return page.items;
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

  const data = await selectDonorProfileRow(supabase, id);
  if (!data) return null;
  const profile = mapRow(data);
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

  const donationsCompleted =
    input.donationsCompleted ?? existing?.donations_completed ?? 0;
  const livesHelped = input.livesHelped ?? existing?.lives_helped ?? 0;
  const avgResponseMinutes =
    input.avgResponseMinutes ?? existing?.avg_response_minutes ?? null;
  const trustScore = computeTrustScore({
    donationsCompleted,
    livesHelped,
    avgResponseMinutes,
    available: input.available,
    joinedAt,
    phone: input.phone,
    city: input.city,
    area: input.area,
    age: input.age,
    telegramChatId: undefined,
  });

  const payload = {
    id: user.id,
    full_name: input.fullName.trim(),
    blood_group: input.bloodGroup,
    phone: input.phone.trim(),
    email: input.email?.trim() || user.email || null,
    city: input.city.trim(),
    area: input.area.trim(),
    lat:
      typeof input.lat === "number" && Number.isFinite(input.lat)
        ? input.lat
        : null,
    lng:
      typeof input.lng === "number" && Number.isFinite(input.lng)
        ? input.lng
        : null,
    available: input.available,
    last_donation: input.lastDonation || null,
    age: input.age ?? null,
    notes: input.notes?.trim() || null,
    donations_completed: donationsCompleted,
    trust_score: trustScore,
    lives_helped: livesHelped,
    avg_response_minutes: avgResponseMinutes ?? 0,
    joined_at: joinedAt,
    updated_at: new Date().toISOString(),
    emergency_voice_calls: input.emergencyVoiceCalls === true,
    phone_verified: input.phoneVerified !== false,
  };

  let data: DonorRow | null = null;
  let lastError: { message: string } | null = null;

  outer: for (const body of donorUpsertVariants(payload)) {
    for (const columns of DONOR_SINGLE_SELECT_TRIES) {
      const attempt = await supabase
        .from("donor_profiles")
        .upsert(body, { onConflict: "id" })
        .select(columns)
        .single();
      if (!attempt.error && attempt.data) {
        data = attempt.data as unknown as DonorRow;
        lastError = null;
        break outer;
      }
      lastError = attempt.error;
      if (attempt.error && !isMissingColumnError(attempt.error)) break outer;
    }
  }

  if (!data) {
    throw new Error(lastError?.message || "Could not save donor profile.");
  }

  return mapRow(data);
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
