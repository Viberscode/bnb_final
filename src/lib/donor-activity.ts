import type { DonorProfile } from "@/types";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DONOR_PROFILE_EVENT } from "@/lib/donor-profile";

export type DonorActivity = {
  verifiedDonations: number;
  criticalCompleted: number;
  emergencyCompleted: number;
  rapidCompleted: number;
  maxInOneCity: number;
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

export async function fetchDonorActivity(
  donorId?: string,
  profile?: DonorProfile | null,
): Promise<DonorActivity> {
  const empty: DonorActivity = {
    verifiedDonations: profile?.donationsCompleted ?? 0,
    criticalCompleted: 0,
    emergencyCompleted: 0,
    rapidCompleted: 0,
    maxInOneCity: 0,
  };
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

  const completed = (data as ActivityRow[])
    .map((row) => ({ row, request: requestFromRow(row) }))
    .filter((item) => item.request?.status === "completed");

  const cityCounts = new Map<string, number>();
  let criticalCompleted = 0;
  let emergencyCompleted = 0;
  let rapidCompleted = 0;

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
    if (Number.isFinite(assignedAt) && assignedAt - createdAt <= 60 * 60 * 1000) {
      rapidCompleted += 1;
    }
    const city = cityKey(request.hospital_area, request.hospital_name);
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }

  let maxInOneCity = 0;
  for (const count of cityCounts.values()) {
    if (count > maxInOneCity) maxInOneCity = count;
  }

  return {
    verifiedDonations: Math.max(profile?.donationsCompleted ?? 0, completed.length),
    criticalCompleted,
    emergencyCompleted,
    rapidCompleted,
    maxInOneCity,
  };
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

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return;

  const { data } = await supabase
    .from("donor_profiles")
    .select("trust_score")
    .eq("id", donorId)
    .maybeSingle();
  if (!data) return;

  const trust = Number((data as { trust_score?: number }).trust_score ?? 72);
  await supabase
    .from("donor_profiles")
    .update({
      trust_score: Math.max(0, trust - 12),
      updated_at: new Date().toISOString(),
    })
    .eq("id", donorId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DONOR_PROFILE_EVENT));
  }
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

  const donations = Number((data as { donations_completed?: number }).donations_completed ?? 0);
  const lives = Number((data as { lives_helped?: number }).lives_helped ?? 0);
  await supabase
    .from("donor_profiles")
    .update({
      donations_completed: donations + 1,
      lives_helped: lives + 1,
      last_donation: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", donorId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DONOR_PROFILE_EVENT));
  }
}
