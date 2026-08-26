import type { BloodRequest, RequestStatus, UrgencyLevel, BloodGroup } from "@/types";
import { BLOOD_GROUPS } from "@/lib/blood-compatibility";
import { createdAfterReset } from "@/lib/data-reset";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const LIVE_REQUESTS_EVENT = "bloodkit:live-requests";

type BloodRequestRow = {
  id: string;
  user_id: string | null;
  blood_group: string;
  urgency: string;
  hospital_id: string;
  hospital_name: string;
  hospital_area: string;
  contact_name: string;
  phone: string | null;
  units: number;
  notes: string | null;
  voice_note_url?: string | null;
  patients_count?: number | null;
  blood_groups?: string[] | null;
  group_units?: Record<string, number> | null;
  status: string;
  distance_km: number | null;
  created_at: string;
};

const VOICE_MARKER = "[[VOICE]]";
const NEED_MARKER = "[[NEED]]";

function parseGroupUnits(raw: unknown): Partial<Record<BloodGroup, number>> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const next: Partial<Record<BloodGroup, number>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(BLOOD_GROUPS as string[]).includes(key)) continue;
    const units = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(units) && units >= 1) {
      next[key as BloodGroup] = Math.min(10, Math.round(units));
    }
  }
  return Object.keys(next).length ? next : undefined;
}

function parseNeedMeta(raw: string): {
  patientsCount?: number;
  bloodGroups?: BloodGroup[];
  groupUnits?: Partial<Record<BloodGroup, number>>;
} {
  try {
    const parsed = JSON.parse(raw) as {
      patients?: number;
      groups?: string[];
      unitsByGroup?: Record<string, number>;
    };
    const groups = (parsed.groups ?? []).filter((group): group is BloodGroup =>
      (BLOOD_GROUPS as string[]).includes(group),
    );
    return {
      patientsCount:
        typeof parsed.patients === "number" && parsed.patients > 0
          ? parsed.patients
          : undefined,
      bloodGroups: groups.length ? groups : undefined,
      groupUnits: parseGroupUnits(parsed.unitsByGroup),
    };
  } catch {
    return {};
  }
}

function splitVoiceFromNotes(
  notes: string | null,
  voiceCol?: string | null,
): {
  notes?: string;
  voiceNoteUrl?: string;
  patientsCount?: number;
  bloodGroups?: BloodGroup[];
  groupUnits?: Partial<Record<BloodGroup, number>>;
} {
  let text = notes ?? "";
  let voice = voiceCol ?? undefined;
  let patientsCount: number | undefined;
  let bloodGroups: BloodGroup[] | undefined;
  let groupUnits: Partial<Record<BloodGroup, number>> | undefined;

  const voiceIdx = text.indexOf(VOICE_MARKER);
  if (voiceIdx !== -1) {
    voice = voice || text.slice(voiceIdx + VOICE_MARKER.length).trim();
    text = text.slice(0, voiceIdx);
  }

  const needIdx = text.indexOf(NEED_MARKER);
  if (needIdx !== -1) {
    const meta = parseNeedMeta(text.slice(needIdx + NEED_MARKER.length).trim());
    patientsCount = meta.patientsCount;
    bloodGroups = meta.bloodGroups;
    groupUnits = meta.groupUnits;
    text = text.slice(0, needIdx);
  }

  return {
    notes: text.trim() || undefined,
    voiceNoteUrl: voice,
    patientsCount,
    bloodGroups,
    groupUnits,
  };
}

function encodeNeedMeta(
  patientsCount?: number,
  bloodGroups?: BloodGroup[],
  groupUnits?: Partial<Record<BloodGroup, number>>,
) {
  const groups = bloodGroups?.length ? bloodGroups : undefined;
  const patients = patientsCount && patientsCount > 1 ? patientsCount : undefined;
  const unitsByGroup =
    groupUnits && Object.keys(groupUnits).length ? groupUnits : undefined;
  if (!groups && !patients && !unitsByGroup) return "";
  return `${NEED_MARKER}${JSON.stringify({
    patients: patientsCount ?? 1,
    groups: bloodGroups ?? [],
    unitsByGroup: unitsByGroup ?? {},
  })}`;
}

function mapRow(row: BloodRequestRow): BloodRequest {
  const split = splitVoiceFromNotes(row.notes, row.voice_note_url);
  const fromColumn = (row.blood_groups ?? []).filter((group): group is BloodGroup =>
    (BLOOD_GROUPS as string[]).includes(group),
  );
  const bloodGroups =
    fromColumn.length > 0 ? fromColumn : split.bloodGroups;
  const patientsCount =
    row.patients_count && row.patients_count > 0
      ? row.patients_count
      : split.patientsCount;

  const groupUnits =
    parseGroupUnits(row.group_units) ?? split.groupUnits;

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    bloodGroup: row.blood_group as BloodGroup,
    urgency: row.urgency as UrgencyLevel,
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name,
    hospitalArea: row.hospital_area,
    contactName: row.contact_name,
    phone: row.phone ?? "",
    units: row.units,
    notes: split.notes,
    voiceNoteUrl: split.voiceNoteUrl,
    bloodGroups,
    groupUnits,
    patientsCount,
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

/** Statuses that still count as an open request (one per user). */
export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  "pending",
  "matching",
  "donor_accepted",
  "donor_enroute",
];

/** Fetch live requests from Supabase. */
export async function fetchLiveRequests(): Promise<BloodRequest[]> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from("blood_requests")
    .select("*")
    .in("status", [...ACTIVE_REQUEST_STATUSES, "completed"])
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase blood_requests fetch failed:", error?.message);
    return [];
  }

  return (data as BloodRequestRow[])
    .map(mapRow)
    .filter((request) => createdAfterReset(request.createdAt));
}

export function isActiveRequestStatus(status: RequestStatus): boolean {
  return ACTIVE_REQUEST_STATUSES.includes(status);
}

/** Fetch live requests created by the signed-in user. */
export async function fetchMyLiveRequests(
  userId?: string,
): Promise<BloodRequest[]> {
  if (!userId) return [];

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("blood_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Supabase my blood_requests fetch failed:", error?.message);
    return [];
  }

  return (data as BloodRequestRow[])
    .map(mapRow)
    .filter((request) => createdAfterReset(request.createdAt));
}

/** Fetch one request by id (live or closed) so invite links can resolve. */
export async function fetchRequestById(
  requestId: string,
): Promise<BloodRequest | null> {
  const id = requestId.trim();
  if (!id) return null;

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from("blood_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const request = mapRow(data as BloodRequestRow);
  return createdAfterReset(request.createdAt) ? request : null;
}

/** Returns the user's current open request, if any. */
export async function fetchActiveRequestForUser(
  userId?: string,
): Promise<BloodRequest | null> {
  if (!userId) return null;

  const mine = await fetchMyLiveRequests(userId);
  return mine.find((r) => isActiveRequestStatus(r.status)) ?? null;
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

  const existing = await fetchActiveRequestForUser(user.id);
  if (existing) {
    throw new Error(
      "You already have an open blood request. Finish or cancel it before raising another.",
    );
  }

  const payload = {
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
    voice_note_url: input.voiceNoteUrl ?? null,
    patients_count: input.patientsCount ?? 1,
    blood_groups: input.bloodGroups?.length
      ? input.bloodGroups
      : [input.bloodGroup],
    group_units: input.groupUnits ?? {},
    status: "matching",
    distance_km: input.distanceKm ?? null,
  };

  let { data, error } = await supabase
    .from("blood_requests")
    .insert(payload)
    .select("*")
    .single();

  if (
    error &&
    /voice_note_url|patients_count|blood_groups|group_units/i.test(error.message)
  ) {
    const extras = [
      encodeNeedMeta(input.patientsCount, input.bloodGroups, input.groupUnits),
      input.voiceNoteUrl ? `${VOICE_MARKER}${input.voiceNoteUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const notesWithExtras = `${input.notes?.trim() ?? ""}\n${extras}`.trim() || null;
    const retry = await supabase
      .from("blood_requests")
      .insert({
        user_id: payload.user_id,
        blood_group: payload.blood_group,
        urgency: payload.urgency,
        hospital_id: payload.hospital_id,
        hospital_name: payload.hospital_name,
        hospital_area: payload.hospital_area,
        contact_name: payload.contact_name,
        phone: payload.phone,
        units: payload.units,
        notes: notesWithExtras,
        status: payload.status,
        distance_km: payload.distance_km,
      })
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw new Error(error?.message || "Could not create blood request.");
  }

  const created = mapRow(data as BloodRequestRow);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIVE_REQUESTS_EVENT));
  }
  return created;
}

export async function cancelLiveRequest(requestId: string): Promise<void> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in to cancel a request.");
  }

  const { error } = await supabase
    .from("blood_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message || "Could not cancel this request.");
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIVE_REQUESTS_EVENT));
  }
}

export async function completeLiveRequest(requestId: string): Promise<void> {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in to confirm this request.");
  }

  const { error } = await supabase
    .from("blood_requests")
    .update({ status: "completed" })
    .eq("id", requestId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message || "Could not confirm this request.");
  }

  const { data: assignment } = await supabase
    .from("request_assignments")
    .select("donor_id")
    .eq("request_id", requestId)
    .eq("status", "accepted")
    .maybeSingle();
  const donorId = (assignment as { donor_id?: string } | null)?.donor_id;
  if (donorId) {
    const { recordVerifiedDonation } = await import("@/lib/donor-activity");
    await recordVerifiedDonation(donorId);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIVE_REQUESTS_EVENT));
  }
}

/** Subscribe to realtime blood_requests changes. */
const liveRequestListeners = new Set<() => void>();
let liveRequestChannel: ReturnType<
  NonNullable<ReturnType<typeof tryCreateClient>>["channel"]
> | null = null;

function notifyLiveRequestListeners() {
  for (const listener of liveRequestListeners) listener();
}

function ensureLiveRequestChannel() {
  if (liveRequestChannel) return;
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return;

  liveRequestChannel = supabase
    .channel(`blood_requests_live_${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "blood_requests" },
      () => notifyLiveRequestListeners(),
    )
    .subscribe();
}

function releaseLiveRequestChannel() {
  if (liveRequestListeners.size > 0 || !liveRequestChannel) return;
  const supabase = tryCreateClient();
  if (supabase) void supabase.removeChannel(liveRequestChannel);
  liveRequestChannel = null;
}

export function subscribeLiveRequests(onChange: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener(LIVE_REQUESTS_EVENT, onChange);
  }

  liveRequestListeners.add(onChange);
  ensureLiveRequestChannel();

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(LIVE_REQUESTS_EVENT, onChange);
    }
    liveRequestListeners.delete(onChange);
    releaseLiveRequestChannel();
  };
}
