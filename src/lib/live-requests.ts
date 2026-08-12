import type { BloodRequest, RequestStatus, UrgencyLevel, BloodGroup } from "@/types";
import { DEMO_LIVE_REQUESTS } from "@/data/demo";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const LIVE_REQUESTS_EVENT = "bloodkit:live-requests";

type BloodRequestRow = {
  id: string;
  blood_group: string;
  urgency: string;
  hospital_id: string;
  hospital_name: string;
  hospital_area: string;
  contact_name: string;
  phone: string | null;
  units: number;
  notes: string | null;
  status: string;
  distance_km: number | null;
  created_at: string;
};

function mapRow(row: BloodRequestRow): BloodRequest {
  return {
    id: row.id,
    bloodGroup: row.blood_group as BloodGroup,
    urgency: row.urgency as UrgencyLevel,
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name,
    hospitalArea: row.hospital_area,
    contactName: row.contact_name,
    phone: row.phone ?? "",
    units: row.units,
    notes: row.notes ?? undefined,
    status: row.status as RequestStatus,
    createdAt: row.created_at,
    distanceKm: row.distance_km ?? undefined,
    isDemo: false,
  };
}

export function urgencyRank(urgency: BloodRequest["urgency"]): number {
  if (urgency === "critical") return 0;
  if (urgency === "urgent") return 1;
  return 2;
}

/** Fetch live requests from Supabase (falls back to demo + local cache). */
export async function fetchLiveRequests(): Promise<BloodRequest[]> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    return DEMO_LIVE_REQUESTS;
  }

  const { data, error } = await supabase
    .from("blood_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase blood_requests fetch failed:", error?.message);
    return DEMO_LIVE_REQUESTS;
  }

  const rows = (data as BloodRequestRow[]).map(mapRow);
  return rows.length > 0 ? rows : DEMO_LIVE_REQUESTS;
}

export async function addLiveRequest(
  input: Omit<BloodRequest, "id" | "createdAt" | "status" | "isDemo">,
): Promise<BloodRequest> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add your project keys to save requests in real time.",
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in with Google before submitting a live request.");
  }

  const { data, error } = await supabase
    .from("blood_requests")
    .insert({
      user_id: user.id,
      blood_group: input.bloodGroup,
      urgency: input.urgency,
      hospital_id: input.hospitalId,
      hospital_name: input.hospitalName,
      hospital_area: input.hospitalArea,
      contact_name: input.contactName,
      phone: input.phone,
      units: input.units,
      notes: input.notes ?? null,
      status: "matching",
      distance_km: input.distanceKm ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create blood request.");
  }

  return mapRow(data as BloodRequestRow);
}

/** Subscribe to realtime blood_requests changes. */
export function subscribeLiveRequests(onChange: () => void) {
  const supabase = tryCreateClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("blood_requests_live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "blood_requests" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
