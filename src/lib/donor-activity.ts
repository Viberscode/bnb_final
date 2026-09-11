import type { DonorProfile } from "@/types";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DONOR_PROFILE_EVENT } from "@/lib/donor-profile";
import { computeTrustScore, trustInputFromProfile } from "@/lib/trust-score";

export type DonorActivity = {
  verifiedDonations: number;
  criticalCompleted: number;
  emergencyCompleted: number;
  rapidCompleted: number;
  maxInOneCity: number;
  acceptedAssignments: number;
  avgResponseMinutes: number | null;
};

type RequestSnap = {
  status: string;
  urgency: string;
  hospital_area: string | null;
  hospital_name: string | null;
  created_at: string;
  patients_count: number | null;
};

type ActivityRow = {
  status: string;
  assigned_at: string | null;
  blood_requests: RequestSnap | RequestSnap[] | null;
};

function requestFromRow(row: ActivityRow): RequestSnap | null {
  if (!row.blood_requests) return null;
  return Array.isArray(row.blood_requests)
    ? row.blood_requests[0] ?? null
    : row.blood_requests;
}

function cityKey(area?: string | null, hospital?: string | null) {
  const fromArea = (area ?? "").split(",").pop()?.trim().toLowerCase();
  if (fromArea) return fromArea;
  return (hospital ?? "").trim().toLowerCase() || "unknown";
}

export function emptyDonorActivity(
  profile?: DonorProfile | null,
): DonorActivity {
  return {
    verifiedDonations: profile?.donationsCompleted ?? 0,
    criticalCompleted: 0,
    emergencyCompleted: 0,
    rapidCompleted: 0,
    maxInOneCity: 0,
    acceptedAssignments: 0,
    avgResponseMinutes: profile?.avgResponseMinutes ?? null,
  };
}

export async function fetchDonorActivity(
  donorId?: string,
  profile?: DonorProfile | null,
): Promise<DonorActivity> {
  const empty = emptyDonorActivity(profile);
  if (!donorId) return empty;

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return empty;

  const { data, error } = await supabase
    .from("request_assignments")
    .select(
      "status, assigned_at, blood_requests(status, urgency, hospital_area, hospital_name, created_at, patients_count)",
    )
    .eq("donor_id", donorId)
    .eq("status", "accepted");

  if (error || !data) return empty;

  const rows = data as ActivityRow[];
  const completed = rows
    .map((row) => ({ row, request: requestFromRow(row) }))
    .filter((item) => item.request?.status === "completed");

  const cityCounts = new Map<string, number>();
  let criticalCompleted = 0;
  let emergencyCompleted = 0;
  let rapidCompleted = 0;
  const responseSamples: number[] = [];

  for (const { row, request } of completed) {
    if (!request) continue;
    if (request.urgency === "critical") criticalCompleted += 1;
    if (request.urgency === "critical" || request.urgency === "urgent") {
      emergencyCompleted += 1;
    }
    const assignedAt = row.assigned_at
      ? new Date(row.assigned_at).getTime()
      : NaN;
    const createdAt = new Date(request.created_at).getTime();
    if (Number.isFinite(assignedAt) && Number.isFinite(createdAt) && assignedAt >= createdAt) {
      const mins = (assignedAt - createdAt) / 60_000;
      responseSamples.push(mins);
      if (mins <= 60) rapidCompleted += 1;
    }
    const city = cityKey(request.hospital_area, request.hospital_name);
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }

  // Also sample response speed from accepts that are not completed yet
  for (const row of rows) {
    const request = requestFromRow(row);
    if (!request || request.status === "completed") continue;
    const assignedAt = row.assigned_at
      ? new Date(row.assigned_at).getTime()
      : NaN;
    const createdAt = new Date(request.created_at).getTime();
    if (Number.isFinite(assignedAt) && Number.isFinite(createdAt) && assignedAt >= createdAt) {
      responseSamples.push((assignedAt - createdAt) / 60_000);
    }
  }

  let maxInOneCity = 0;
  for (const count of cityCounts.values()) {
    if (count > maxInOneCity) maxInOneCity = count;
  }

  const avgResponseMinutes = responseSamples.length
    ? Math.max(
        1,
        Math.round(
          responseSamples.reduce((sum, n) => sum + n, 0) / responseSamples.length,
        ),
      )
    : profile?.avgResponseMinutes ?? null;

  return {
    verifiedDonations: Math.max(
      profile?.donationsCompleted ?? 0,
      completed.length,
    ),
    criticalCompleted,
    emergencyCompleted,
    rapidCompleted,
    maxInOneCity,
    acceptedAssignments: rows.length,
    avgResponseMinutes,
  };
}

function readNoShowPenalty(donorId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("bloodkit-noshows") || "[]";
    const stamps = JSON.parse(raw) as string[];
    return stamps.filter((stamp) => stamp.endsWith(`:${donorId}`)).length * 12;
  } catch {
    return 0;
  }
}

export async function syncDonorTrustStats(
  donorId: string,
  profile?: DonorProfile | null,
) {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return null;

  const { data } = await supabase
    .from("donor_profiles")
    .select("*")
    .eq("id", donorId)
    .maybeSingle();
  if (!data) return null;

  const mapped: DonorProfile = profile ?? {
    id: donorId,
    fullName: String((data as { full_name?: string }).full_name ?? ""),
    bloodGroup: ((data as { blood_group?: string }).blood_group ?? "O+") as DonorProfile["bloodGroup"],
    phone: String((data as { phone?: string }).phone ?? ""),
    city: String((data as { city?: string }).city ?? ""),
    area: String((data as { area?: string }).area ?? ""),
    available: Boolean((data as { available?: boolean }).available),
    age: (data as { age?: number | null }).age ?? undefined,
    donationsCompleted: Number(
      (data as { donations_completed?: number }).donations_completed ?? 0,
    ),
    trustScore: Number((data as { trust_score?: number }).trust_score ?? 0),
    livesHelped: Number((data as { lives_helped?: number }).lives_helped ?? 0),
    avgResponseMinutes: Number(
      (data as { avg_response_minutes?: number }).avg_response_minutes ?? 0,
    ),
    joinedAt: String(
      (data as { joined_at?: string }).joined_at ?? new Date().toISOString(),
    ),
    telegramChatId:
      (data as { telegram_chat_id?: string | null }).telegram_chat_id ??
      undefined,
  };

  const activity = await fetchDonorActivity(donorId, mapped);
  const donations = activity.verifiedDonations;
  const lives = Math.max(mapped.livesHelped, donations);
  const avg =
    activity.avgResponseMinutes ?? mapped.avgResponseMinutes ?? null;
  const trust = computeTrustScore(
    trustInputFromProfile(
      {
        ...mapped,
        donationsCompleted: donations,
        livesHelped: lives,
        avgResponseMinutes: avg ?? mapped.avgResponseMinutes,
      },
      activity,
      { noShowPenalty: readNoShowPenalty(donorId) },
    ),
  );

  const nextAvg = avg ?? mapped.avgResponseMinutes;
  const unchanged =
    mapped.trustScore === trust &&
    mapped.donationsCompleted === donations &&
    mapped.livesHelped === lives &&
    mapped.avgResponseMinutes === nextAvg;

  if (!unchanged) {
    await supabase
      .from("donor_profiles")
      .update({
        donations_completed: donations,
        lives_helped: lives,
        avg_response_minutes: nextAvg,
        trust_score: trust,
        updated_at: new Date().toISOString(),
      })
      .eq("id", donorId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(DONOR_PROFILE_EVENT));
    }
  }

  return { trust, donations, lives, avgResponseMinutes: avg, activity };
}

export async function recordDonorNoShow(donorId?: string | null, requestId?: string) {
  if (!donorId) return;
  if (typeof window !== "undefined" && requestId) {
    const key = "bloodkit-noshows";
    try {
      const seen = new Set<string>(
        JSON.parse(window.localStorage.getItem(key) || "[]") as string[],
      );
      const stamp = `${requestId}:${donorId}`;
      if (seen.has(stamp)) return;
      seen.add(stamp);
      window.localStorage.setItem(key, JSON.stringify([...seen].slice(-80)));
    } catch {
      /* continue */
    }
  }

  await syncDonorTrustStats(donorId);
}

export async function recordVerifiedDonation(donorId?: string | null) {
  if (!donorId) return;
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return;

  const { data } = await supabase
    .from("donor_profiles")
    .select("donations_completed, lives_helped")
    .eq("id", donorId)
    .maybeSingle();
  if (!data) return;

  const donations =
    Number((data as { donations_completed?: number }).donations_completed ?? 0) +
    1;
  const lives =
    Number((data as { lives_helped?: number }).lives_helped ?? 0) + 1;

  await supabase
    .from("donor_profiles")
    .update({
      donations_completed: donations,
      lives_helped: lives,
      last_donation: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", donorId);

  await syncDonorTrustStats(donorId);
}
