import type { BloodRequest, RequestStatus, UrgencyLevel, BloodGroup } from "@/types";
import { BLOOD_GROUPS } from "@/lib/blood-compatibility";
import { createdAfterReset } from "@/lib/data-reset";
import {
  LIVE_REQUEST_PAGE_SIZE,
  MY_REQUEST_PAGE_SIZE,
  emptyPage,
  pageFromRows,
  parsePageParams,
  type PageParams,
  type PageResult,
} from "@/lib/pagination";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const LIVE_REQUESTS_EVENT = "bloodkit:live-requests";

/** Public live feed only shows requests from the last 24 hours. */
export const LIVE_REQUEST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isWithinLiveWindow(iso?: string | null, now = Date.now()) {
  if (!iso) return false;
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created <= LIVE_REQUEST_MAX_AGE_MS;
}

type BloodRequestRow = {
  id: string;
  user_id: string | null;
  blood_group: string;
  urgency: string;
  hospital_id: string;
  hospital_name: string;
  hospital_area: string;
  hospital_lat?: number | null;
  hospital_lng?: number | null;
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
  hospitalLat?: number;
  hospitalLng?: number;
} {
  try {
    const parsed = JSON.parse(raw) as {
      patients?: number;
      groups?: string[];
      unitsByGroup?: Record<string, number>;
      hLat?: number;
      hLng?: number;
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
      hospitalLat:
        typeof parsed.hLat === "number" && Number.isFinite(parsed.hLat)
          ? parsed.hLat
          : undefined,
      hospitalLng:
        typeof parsed.hLng === "number" && Number.isFinite(parsed.hLng)
          ? parsed.hLng
          : undefined,
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
  hospitalLat?: number;
  hospitalLng?: number;
} {
  let text = notes ?? "";
  let voice = voiceCol ?? undefined;
  let patientsCount: number | undefined;
  let bloodGroups: BloodGroup[] | undefined;
  let groupUnits: Partial<Record<BloodGroup, number>> | undefined;
  let hospitalLat: number | undefined;
  let hospitalLng: number | undefined;

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
    hospitalLat = meta.hospitalLat;
    hospitalLng = meta.hospitalLng;
    text = text.slice(0, needIdx);
  }

  return {
    notes: text.trim() || undefined,
    voiceNoteUrl: voice,
    patientsCount,
    bloodGroups,
    groupUnits,
    hospitalLat,
    hospitalLng,
  };
}

function encodeNeedMeta(
  patientsCount?: number,
  bloodGroups?: BloodGroup[],
  groupUnits?: Partial<Record<BloodGroup, number>>,
  hospitalLat?: number,
  hospitalLng?: number,
) {
  const groups = bloodGroups?.length ? bloodGroups : undefined;
  const patients = patientsCount && patientsCount > 1 ? patientsCount : undefined;
  const unitsByGroup =
    groupUnits && Object.keys(groupUnits).length ? groupUnits : undefined;
  const hasGeo =
    typeof hospitalLat === "number" &&
    typeof hospitalLng === "number" &&
    Number.isFinite(hospitalLat) &&
    Number.isFinite(hospitalLng);
  if (!groups && !patients && !unitsByGroup && !hasGeo) return "";
  return `${NEED_MARKER}${JSON.stringify({
    patients: patientsCount ?? 1,
    groups: bloodGroups ?? [],
    unitsByGroup: unitsByGroup ?? {},
    ...(hasGeo ? { hLat: hospitalLat, hLng: hospitalLng } : {}),
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
    hospitalLat:
      typeof row.hospital_lat === "number" && Number.isFinite(row.hospital_lat)
        ? row.hospital_lat
        : split.hospitalLat,
    hospitalLng:
      typeof row.hospital_lng === "number" && Number.isFinite(row.hospital_lng)
        ? row.hospital_lng
        : split.hospitalLng,
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

/** Statuses that still count as an open request (one per user). */
export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  "pending",
  "matching",
  "donor_accepted",
  "donor_enroute",
];

export function isActiveRequestStatus(status: RequestStatus): boolean {
  return ACTIVE_REQUEST_STATUSES.includes(status);
}

const BLOOD_REQUEST_COLUMNS_CORE =
  "id, user_id, blood_group, urgency, hospital_id, hospital_name, hospital_area, contact_name, phone, units, notes, status, distance_km, created_at";

const BLOOD_REQUEST_COLUMNS_META = `${BLOOD_REQUEST_COLUMNS_CORE}, voice_note_url, patients_count, blood_groups, group_units`;

const BLOOD_REQUEST_COLUMNS_FULL = `${BLOOD_REQUEST_COLUMNS_META}, hospital_lat, hospital_lng`;

const BLOOD_REQUEST_COLUMN_TRIES = [
  BLOOD_REQUEST_COLUMNS_FULL,
  BLOOD_REQUEST_COLUMNS_META,
  BLOOD_REQUEST_COLUMNS_CORE,
] as const;

type QueryClient = {
  from: (table: string) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any;
};

type SupabaseResult<T> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};

function isMissingColumnError(error: { message?: string } | null) {
  if (!error?.message) return false;
  return /column|does not exist|42703|schema cache/i.test(error.message);
}

async function selectBloodRequests<T>(
  run: (columns: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
    count?: number | null;
  }>,
): Promise<SupabaseResult<T>> {
  let last: SupabaseResult<T> = { data: null, error: { message: "select failed" } };
  for (const columns of BLOOD_REQUEST_COLUMN_TRIES) {
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

export type LiveRequestInput = Omit<
  BloodRequest,
  "id" | "createdAt" | "status" | "isDemo"
>;

export function parseLivePage(searchParams: URLSearchParams) {
  return parsePageParams(searchParams, LIVE_REQUEST_PAGE_SIZE);
}

export function parseMinePage(searchParams: URLSearchParams) {
  return parsePageParams(searchParams, MY_REQUEST_PAGE_SIZE);
}

export async function queryLiveRequestPage(
  supabase: QueryClient,
  params: PageParams,
): Promise<PageResult<BloodRequest>> {
  const since = new Date(Date.now() - LIVE_REQUEST_MAX_AGE_MS).toISOString();
  const to = params.offset + params.limit - 1;
  const { data, error, count } = await selectBloodRequests<BloodRequestRow[]>(
    (columns) =>
      supabase
        .from("blood_requests")
        .select(columns, { count: "exact" })
        .in("status", [...ACTIVE_REQUEST_STATUSES, "completed"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(params.offset, to),
  );

  if (error) {
    console.warn("Supabase blood_requests page failed:", error.message);
    return emptyPage(params.offset, params.limit);
  }

  const rows = (data as BloodRequestRow[] | null) ?? [];
  const mapped = rows
    .map(mapRow)
    .filter((request) => createdAfterReset(request.createdAt));
  return pageFromRows(mapped, params, count ?? null);
}

export async function queryMyRequestPage(
  supabase: QueryClient,
  userId: string,
  params: PageParams,
): Promise<PageResult<BloodRequest>> {
  const to = params.offset + params.limit - 1;
  const { data, error, count } = await selectBloodRequests<BloodRequestRow[]>(
    (columns) =>
      supabase
        .from("blood_requests")
        .select(columns, { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(params.offset, to),
  );

  if (error) {
    console.warn("Supabase my blood_requests page failed:", error.message);
    return emptyPage(params.offset, params.limit);
  }

  const mapped = ((data as BloodRequestRow[] | null) ?? [])
    .map(mapRow)
    .filter((request) => createdAfterReset(request.createdAt));
  return pageFromRows(mapped, params, count ?? null);
}

export async function queryMyRequestCount(
  supabase: QueryClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("blood_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count ?? 0;
}

export async function queryActiveRequestForUser(
  supabase: QueryClient,
  userId: string,
): Promise<BloodRequest | null> {
  const { data, error } = await selectBloodRequests<BloodRequestRow>(
    (columns) =>
      supabase
        .from("blood_requests")
        .select(columns)
        .eq("user_id", userId)
        .in("status", ACTIVE_REQUEST_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
  );

  if (error || !data) return null;
  const request = mapRow(data as BloodRequestRow);
  return createdAfterReset(request.createdAt) ? request : null;
}

async function fetchJsonPage<T>(
  url: string,
  fallback: () => Promise<PageResult<T>>,
): Promise<PageResult<T>> {
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    if (!res.ok) return fallback();
    const body = (await res.json()) as PageResult<T>;
    if (!Array.isArray(body.items)) return fallback();
    return body;
  } catch {
    return fallback();
  }
}

export function urgencyRank(urgency: BloodRequest["urgency"]): number {
  if (urgency === "critical") return 0;
  if (urgency === "urgent") return 1;
  return 2;
}

export async function fetchLiveRequestsPage(
  offset = 0,
  limit = LIVE_REQUEST_PAGE_SIZE,
): Promise<PageResult<BloodRequest>> {
  const params = { offset, limit };
  return fetchJsonPage(`/api/requests/live?offset=${offset}&limit=${limit}`, async () => {
    const supabase = tryCreateClient();
    if (!supabase || !isSupabaseConfigured()) return emptyPage(offset, limit);
    return queryLiveRequestPage(supabase, params);
  });
}

/** First page of the public live feed (last 24 hours). */
export async function fetchLiveRequests(): Promise<BloodRequest[]> {
  const page = await fetchLiveRequestsPage(0, LIVE_REQUEST_PAGE_SIZE);
  return page.items;
}

export async function fetchMyLiveRequestsPage(
  userId?: string,
  offset = 0,
  limit = MY_REQUEST_PAGE_SIZE,
): Promise<PageResult<BloodRequest>> {
  if (!userId) return emptyPage(offset, limit);
  return fetchJsonPage(`/api/requests/mine?offset=${offset}&limit=${limit}`, async () => {
    const supabase = tryCreateClient();
    if (!supabase || !isSupabaseConfigured()) return emptyPage(offset, limit);
    return queryMyRequestPage(supabase, userId, { offset, limit });
  });
}

/** First page of the signed-in user's requests. */
export async function fetchMyLiveRequests(
  userId?: string,
): Promise<BloodRequest[]> {
  const page = await fetchMyLiveRequestsPage(userId, 0, MY_REQUEST_PAGE_SIZE);
  return page.items;
}

export async function fetchMyLiveRequestCount(userId?: string): Promise<number> {
  if (!userId) return 0;
  try {
    const res = await fetch("/api/requests/mine?countOnly=1", {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const body = (await res.json()) as { total?: number };
      if (typeof body.total === "number") return body.total;
    }
  } catch {
    /* fall through */
  }
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return 0;
  return queryMyRequestCount(supabase, userId);
}

/** Fetch one request by id (live or closed) so invite links can resolve. */
export async function fetchRequestById(
  requestId: string,
): Promise<BloodRequest | null> {
  const id = requestId.trim();
  if (!id) return null;

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return null;

  const { data, error } = await selectBloodRequests<BloodRequestRow>(
    (columns) =>
      supabase.from("blood_requests").select(columns).eq("id", id).maybeSingle(),
  );

  if (error || !data) return null;
  const request = mapRow(data as BloodRequestRow);
  return createdAfterReset(request.createdAt) ? request : null;
}

/** Returns the user's current open request, if any. */
export async function fetchActiveRequestForUser(
  userId?: string,
): Promise<BloodRequest | null> {
  if (!userId) return null;

  try {
    const res = await fetch("/api/requests/mine?active=1", {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const body = (await res.json()) as { item?: BloodRequest | null };
      if (body.item) return body.item;
      if (body.item === null) return null;
    }
  } catch {
    /* fall through */
  }

  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return null;
  return queryActiveRequestForUser(supabase, userId);
}

export async function fetchRequestsAssignedToDonor(
  donorId?: string,
): Promise<BloodRequest[]> {
  if (!donorId) return [];
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return [];

  const { data: rows, error } = await supabase
    .from("request_assignments")
    .select("request_id")
    .eq("donor_id", donorId)
    .in("status", ["pending", "accepted"])
    .limit(12);

  if (error || !rows?.length) return [];
  const ids = [
    ...new Set(
      rows
        .map((row) => String((row as { request_id?: string }).request_id ?? ""))
        .filter(Boolean),
    ),
  ];
  if (!ids.length) return [];

  const { data, error: requestError } = await selectBloodRequests<BloodRequestRow[]>(
    (columns) => supabase.from("blood_requests").select(columns).in("id", ids),
  );

  if (requestError || !data) return [];
  return (data as BloodRequestRow[])
    .map(mapRow)
    .filter((request) => createdAfterReset(request.createdAt));
}

export async function createLiveRequestForUser(
  supabase: QueryClient,
  userId: string,
  input: LiveRequestInput,
): Promise<BloodRequest> {
  const existing = await queryActiveRequestForUser(supabase, userId);
  if (existing) {
    throw new Error(
      "You already have an open blood request. Finish or cancel it before raising another.",
    );
  }

  const needMeta = encodeNeedMeta(
    input.patientsCount,
    input.bloodGroups,
    input.groupUnits,
    input.hospitalLat,
    input.hospitalLng,
  );
  const notesWithMeta = [input.notes?.trim(), needMeta].filter(Boolean).join("\n") || null;

  const fullPayload = {
    user_id: userId,
    blood_group: input.bloodGroup,
    urgency: input.urgency,
    hospital_id: input.hospitalId,
    hospital_name: input.hospitalName,
    hospital_area: input.hospitalArea,
    hospital_lat: input.hospitalLat ?? null,
    hospital_lng: input.hospitalLng ?? null,
    contact_name: input.contactName,
    phone: input.phone,
    units: input.units,
    notes: notesWithMeta,
    voice_note_url: input.voiceNoteUrl ?? null,
    patients_count: input.patientsCount ?? 1,
    blood_groups: input.bloodGroups?.length
      ? input.bloodGroups
      : [input.bloodGroup],
    group_units: input.groupUnits ?? {},
    status: "matching",
    distance_km: input.distanceKm ?? null,
  };

  const metaPayload = {
    user_id: fullPayload.user_id,
    blood_group: fullPayload.blood_group,
    urgency: fullPayload.urgency,
    hospital_id: fullPayload.hospital_id,
    hospital_name: fullPayload.hospital_name,
    hospital_area: fullPayload.hospital_area,
    contact_name: fullPayload.contact_name,
    phone: fullPayload.phone,
    units: fullPayload.units,
    notes: notesWithMeta,
    voice_note_url: fullPayload.voice_note_url,
    patients_count: fullPayload.patients_count,
    blood_groups: fullPayload.blood_groups,
    group_units: fullPayload.group_units,
    status: fullPayload.status,
    distance_km: fullPayload.distance_km,
  };

  const voiceInNotes = input.voiceNoteUrl
    ? `${input.notes?.trim() ?? ""}\n${VOICE_MARKER}${input.voiceNoteUrl}\n${needMeta}`.trim()
    : notesWithMeta;

  const corePayload = {
    user_id: fullPayload.user_id,
    blood_group: fullPayload.blood_group,
    urgency: fullPayload.urgency,
    hospital_id: fullPayload.hospital_id,
    hospital_name: fullPayload.hospital_name,
    hospital_area: fullPayload.hospital_area,
    contact_name: fullPayload.contact_name,
    phone: fullPayload.phone,
    units: fullPayload.units,
    notes: voiceInNotes || null,
    status: fullPayload.status,
    distance_km: fullPayload.distance_km,
  };

  async function tryInsert(payload: Record<string, unknown>) {
    return supabase.from("blood_requests").insert(payload).select("*").single();
  }

  let { data, error } = await tryInsert(fullPayload);
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await tryInsert(metaPayload));
  }
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await tryInsert(corePayload));
  }

  if (error || !data) {
    throw new Error(error?.message || "Could not create blood request.");
  }

  return mapRow(data as BloodRequestRow);
}

export async function addLiveRequest(
  input: LiveRequestInput,
): Promise<BloodRequest> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await res.json()) as { item?: BloodRequest; error?: string };
      if (res.ok && body.item) {
        window.dispatchEvent(new Event(LIVE_REQUESTS_EVENT));
        return body.item;
      }
      if (body.error && res.status !== 503) {
        throw new Error(body.error);
      }
    } catch (err) {
      if (err instanceof Error && err.message && !/fetch|network/i.test(err.message)) {
        throw err;
      }
    }
  }

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

  const created = await createLiveRequestForUser(supabase, user.id, input);
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
