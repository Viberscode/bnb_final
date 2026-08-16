import { DEMO_HOSPITALS } from "@/data/demo";
import { donorMatchesRequest } from "@/lib/blood-compatibility";
import { isActiveRequestStatus, urgencyRank } from "@/lib/live-requests";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  AssignmentStatus,
  BloodRequest,
  DonorAssignment,
  DonorProfile,
} from "@/types";

export const ASSIGNMENT_EVENT = "bloodkit:assignments";
export const ASSIGNMENT_WAIT_MS = 150_000;
const STORAGE_KEY = "bloodkit-assignments";
const STORAGE_VERSION_KEY = "bloodkit-assignments-v";
const STORAGE_VERSION = "5";

type AssignmentStore = Record<string, DonorAssignment>;

function normalizePlace(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function placesOverlap(a: string, b: string) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Estimated km from a donor's city/area to the request hospital. */
export function donorDistanceKm(
  donor: Pick<DonorProfile, "city" | "area">,
  request: Pick<BloodRequest, "hospitalId" | "hospitalArea" | "distanceKm">,
): number {
  const hospital = DEMO_HOSPITALS.find((item) => item.id === request.hospitalId);
  const donorCity = normalizePlace(donor.city);
  const donorArea = normalizePlace(donor.area);
  const hospitalCity = normalizePlace(hospital?.city ?? "");
  const hospitalArea = normalizePlace(hospital?.area ?? request.hospitalArea);

  if (placesOverlap(donorArea, hospitalArea)) return 1.5;
  if (placesOverlap(donorCity, hospitalCity)) return 7.5;
  if (typeof request.distanceKm === "number") {
    return request.distanceKm + (hospitalCity && donorCity ? 18 : 8);
  }
  return 32;
}

export function compareRequestsByPriority(a: BloodRequest, b: BloodRequest) {
  const urgency = urgencyRank(a.urgency) - urgencyRank(b.urgency);
  if (urgency !== 0) return urgency;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function compareDonorsForRequest(
  a: DonorProfile,
  b: DonorProfile,
  request: BloodRequest,
) {
  const distance = donorDistanceKm(a, request) - donorDistanceKm(b, request);
  if (Math.abs(distance) > 0.05) return distance;
  return b.donationsCompleted - a.donationsCompleted;
}

export function rankRequestsForDonor(
  requests: BloodRequest[],
  donor: DonorProfile,
): BloodRequest[] {
  return [...requests]
    .filter(
      (request) =>
        !isOwnDonor(request, donor) &&
        donorMatchesRequest(donor.bloodGroup, request),
    )
    .sort((a, b) => {
      const urgency = compareRequestsByPriority(a, b);
      if (urgency !== 0) return urgency;
      return donorDistanceKm(donor, a) - donorDistanceKm(donor, b);
    });
}

function digitsOnly(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

function phonesMatch(a?: string, b?: string) {
  const left = digitsOnly(a).slice(-10);
  const right = digitsOnly(b).slice(-10);
  return Boolean(left && right && left === right);
}

/** A requester cannot be assigned as their own donor. */
export function isOwnDonor(
  request: BloodRequest,
  donor: Pick<DonorProfile, "id" | "phone">,
) {
  if (request.userId && donor.id === request.userId) return true;
  return phonesMatch(request.phone, donor.phone);
}

export function isSelfAssignment(
  request: BloodRequest,
  assignment?: DonorAssignment,
  viewerId?: string,
) {
  if (!assignment?.donorId) return false;
  if (request.userId && assignment.donorId === request.userId) return true;
  if (viewerId && assignment.donorId === viewerId) return true;
  return false;
}

export function canViewAssignedDonor(
  request: BloodRequest,
  assignment?: DonorAssignment,
  viewerId?: string,
) {
  if (!assignment?.donorId) return false;
  if (assignment.status !== "pending" && assignment.status !== "accepted") {
    return false;
  }
  return !isSelfAssignment(request, assignment, viewerId);
}

/** Phone / WhatsApp only after a donor has confirmed the match. */
export function canShareContactDetails(assignment?: DonorAssignment) {
  return Boolean(assignment?.donorId && assignment.status === "accepted");
}

/** Contact (name/phone) only after this viewer is part of an accepted match. */
export function canRevealContacts(
  request: BloodRequest,
  viewerId?: string | null,
) {
  if (!canShareContactDetails(request.assignment)) return false;
  if (viewerId && request.userId && viewerId === request.userId) return true;
  if (viewerId && request.assignment?.donorId === viewerId) return true;
  return false;
}

export function isAssignedDonor(
  request: BloodRequest,
  donorId?: string | null,
) {
  const assignment = request.assignment;
  return Boolean(
    donorId &&
      assignment?.donorId === donorId &&
      (assignment.status === "pending" || assignment.status === "accepted"),
  );
}

export function remainingMs(assignment?: DonorAssignment) {
  if (!assignment || assignment.status !== "pending") return 0;
  return Math.max(0, new Date(assignment.expiresAt).getTime() - Date.now());
}

export function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function readStore(): AssignmentStore {
  if (typeof window === "undefined") return {};
  try {
    if (window.localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AssignmentStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: AssignmentStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(ASSIGNMENT_EVENT));
}

function notifyLive() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("bloodkit:live-requests"));
}

function toAssignment(row: Record<string, unknown>): DonorAssignment | null {
  const donorId = String(row.donor_id ?? row.donorId ?? "");
  const status = String(row.status ?? "pending") as AssignmentStatus;
  if (!donorId && status !== "searching") return null;
  return {
    donorId,
    donorName: String(row.donor_name ?? row.donorName ?? ""),
    bloodGroup: (row.blood_group ?? row.bloodGroup ?? "O+") as DonorAssignment["bloodGroup"],
    donationsCompleted: Number(row.donations_completed ?? row.donationsCompleted ?? 0),
    distanceKm: Number(row.distance_km ?? row.distanceKm ?? 0),
    status,
    assignedAt: String(row.assigned_at ?? row.assignedAt ?? new Date().toISOString()),
    expiresAt: String(row.expiresAt ?? row.expires_at ?? new Date().toISOString()),
    declinedDonorIds: Array.isArray(row.declined_donor_ids)
      ? (row.declined_donor_ids as string[])
      : Array.isArray(row.declinedDonorIds)
        ? (row.declinedDonorIds as string[])
        : [],
  };
}

let remoteAssignmentsReady: boolean | null = null;
let remoteUnavailableUntil = 0;
let remoteFetchInFlight: Promise<AssignmentStore> | null = null;
let lastRemoteFetchAt = 0;
let remoteCache: AssignmentStore = {};
const REMOTE_FETCH_MS = 800;
const REMOTE_RETRY_MS = 20_000;

function isMissingAssignmentsTable(error: {
  code?: string;
  message?: string;
} | null) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

function markAssignmentsRemoteUnavailable() {
  remoteAssignmentsReady = false;
  remoteUnavailableUntil = Date.now() + REMOTE_RETRY_MS;
}

function canUseRemoteAssignments() {
  if (remoteAssignmentsReady === false && Date.now() < remoteUnavailableUntil) {
    return false;
  }
  return true;
}

function readMergedStore(): AssignmentStore {
  return { ...readStore(), ...remoteCache };
}

async function fetchRemoteStore(force = false): Promise<AssignmentStore> {
  if (!canUseRemoteAssignments()) return remoteCache;
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return remoteCache;
  if (remoteFetchInFlight) return remoteFetchInFlight;
  if (!force && Date.now() - lastRemoteFetchAt < REMOTE_FETCH_MS) {
    return remoteCache;
  }

  remoteFetchInFlight = (async () => {
    const { data, error } = await supabase.from("request_assignments").select("*");
    lastRemoteFetchAt = Date.now();
    if (error) {
      if (isMissingAssignmentsTable(error)) markAssignmentsRemoteUnavailable();
      return remoteCache;
    }
    remoteAssignmentsReady = true;
    remoteUnavailableUntil = 0;
    const next: AssignmentStore = {};
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const requestId = String(row.request_id ?? "");
      const assignment = toAssignment(row);
      if (requestId && assignment) next[requestId] = assignment;
    }
    remoteCache = next;
    return next;
  })();

  try {
    return await remoteFetchInFlight;
  } finally {
    remoteFetchInFlight = null;
  }
}

async function persistAssignment(requestId: string, assignment: DonorAssignment) {
  if (!canUseRemoteAssignments()) return;
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return;
  const { error } = await supabase.from("request_assignments").upsert(
    {
      request_id: requestId,
      donor_id: assignment.donorId || null,
      donor_name: assignment.donorName,
      blood_group: assignment.bloodGroup,
      donations_completed: assignment.donationsCompleted,
      distance_km: assignment.distanceKm,
      status: assignment.status,
      assigned_at: assignment.assignedAt,
      expires_at: assignment.expiresAt,
      declined_donor_ids: assignment.declinedDonorIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "request_id" },
  );
  if (error) {
    if (isMissingAssignmentsTable(error)) markAssignmentsRemoteUnavailable();
    return;
  }
  remoteAssignmentsReady = true;
  remoteCache = { ...remoteCache, [requestId]: assignment };
  notifyLive();
}

async function persistRequestStatus(
  requestId: string,
  status: BloodRequest["status"],
) {
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return;
  await supabase.from("blood_requests").update({ status }).eq("id", requestId);
}

function makeAssignment(
  donor: DonorProfile,
  request: BloodRequest,
  declinedDonorIds: string[],
): DonorAssignment {
  const now = Date.now();
  return {
    donorId: donor.id,
    donorName: donor.fullName,
    bloodGroup: donor.bloodGroup,
    donationsCompleted: donor.donationsCompleted,
    distanceKm: donorDistanceKm(donor, request),
    status: "pending",
    assignedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ASSIGNMENT_WAIT_MS).toISOString(),
    declinedDonorIds,
  };
}

function searchingAssignment(declinedDonorIds: string[]): DonorAssignment {
  const now = Date.now();
  return {
    donorId: "",
    donorName: "",
    bloodGroup: "O+",
    donationsCompleted: 0,
    distanceKm: 0,
    status: "searching",
    assignedAt: new Date(now).toISOString(),
    expiresAt: new Date(now).toISOString(),
    declinedDonorIds,
  };
}

function busyDonorIds(store: AssignmentStore, exceptRequestId?: string) {
  const busy = new Set<string>();
  for (const [requestId, assignment] of Object.entries(store)) {
    if (requestId === exceptRequestId) continue;
    if (
      (assignment.status === "pending" || assignment.status === "accepted") &&
      assignment.donorId
    ) {
      busy.add(assignment.donorId);
    }
  }
  return busy;
}

export function pickNextDonor(
  request: BloodRequest,
  donors: DonorProfile[],
  declinedDonorIds: string[],
  takenIds: Set<string>,
) {
  return donors
    .filter(
      (donor) =>
        donor.available &&
        !isOwnDonor(request, donor) &&
        !declinedDonorIds.includes(donor.id) &&
        !takenIds.has(donor.id) &&
        donorMatchesRequest(donor.bloodGroup, request),
    )
    .sort((a, b) => compareDonorsForRequest(a, b, request))[0];
}

function assignmentFingerprint(assignment?: DonorAssignment) {
  if (!assignment) return "";
  return [
    assignment.donorId,
    assignment.status,
    assignment.assignedAt,
    assignment.expiresAt,
    assignment.declinedDonorIds.join(","),
  ].join("|");
}

function assignmentMatchesRequester(
  request: BloodRequest,
  assignment: DonorAssignment | undefined,
  donors: DonorProfile[],
) {
  if (!assignment?.donorId) return false;
  if (isSelfAssignment(request, assignment)) return true;
  const donor = donors.find((item) => item.id === assignment.donorId);
  return Boolean(donor && isOwnDonor(request, donor));
}

function resolveRequestAssignment(
  request: BloodRequest,
  donors: DonorProfile[],
  store: AssignmentStore,
  options?: { allowCreate?: boolean },
): DonorAssignment | undefined {
  const allowCreate = options?.allowCreate !== false;
  if (!isActiveRequestStatus(request.status)) return store[request.id];

  const current = store[request.id];
  const declined = current?.declinedDonorIds ?? [];
  const taken = busyDonorIds(store, request.id);

  if (assignmentMatchesRequester(request, current, donors)) {
    if (!allowCreate) return searchingAssignment(declined);
    const nextDeclined = [
      ...new Set([...declined, ...(current?.donorId ? [current.donorId] : [])]),
    ];
    const next = pickNextDonor(request, donors, nextDeclined, taken);
    return next
      ? makeAssignment(next, request, nextDeclined)
      : searchingAssignment(nextDeclined);
  }

  if (current?.status === "accepted" && current.donorId) return current;

  if (current?.status === "pending" && current.donorId) {
    if (remainingMs(current) > 0) return current;
    if (!allowCreate) return searchingAssignment([...new Set([...declined, current.donorId])]);
    const nextDeclined = [...new Set([...declined, current.donorId])];
    const next = pickNextDonor(request, donors, nextDeclined, taken);
    return next
      ? makeAssignment(next, request, nextDeclined)
      : searchingAssignment(nextDeclined);
  }

  if (!allowCreate) {
    return current ?? searchingAssignment(declined);
  }

  if (current?.status === "declined" || current?.status === "expired") {
    const next = pickNextDonor(request, donors, declined, taken);
    return next
      ? makeAssignment(next, request, declined)
      : searchingAssignment(declined);
  }

  if (current?.status === "searching") {
    const next = pickNextDonor(request, donors, declined, taken);
    return next ? makeAssignment(next, request, declined) : current;
  }

  const first = pickNextDonor(request, donors, declined, taken);
  return first
    ? makeAssignment(first, request, declined)
    : searchingAssignment(declined);
}

export async function syncAssignments(
  requests: BloodRequest[],
  donors: DonorProfile[],
  options?: { allowCreate?: boolean },
): Promise<BloodRequest[]> {
  const allowCreate = options?.allowCreate !== false;
  const local = readStore();
  const remote = await fetchRemoteStore(true);
  const store: AssignmentStore = { ...local, ...remote };
  let changed = false;

  const queue = [...requests].sort(compareRequestsByPriority);
  const persists: Promise<void>[] = [];
  for (const request of queue) {
    const next = resolveRequestAssignment(request, donors, store, {
      allowCreate,
    });
    if (assignmentFingerprint(store[request.id]) !== assignmentFingerprint(next)) {
      changed = true;
      if (next) {
        store[request.id] = next;
        persists.push(persistAssignment(request.id, next));
        if (next.status === "pending" && request.status === "pending") {
          void persistRequestStatus(request.id, "matching");
        }
      }
    }
  }
  if (persists.length) await Promise.all(persists);

  if (changed) writeStore(store);
  else if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  return requests.map((request) => ({
    ...request,
    assignment: store[request.id],
    status:
      store[request.id]?.status === "accepted" &&
      isActiveRequestStatus(request.status)
        ? "donor_accepted"
        : request.status,
  }));
}

export function withAssignments(
  requests: BloodRequest[],
  donors: DonorProfile[],
  options?: { allowCreate?: boolean },
): BloodRequest[] {
  const allowCreate = options?.allowCreate !== false;
  const store = readMergedStore();
  let changed = false;
  const resolved = requests.map((request) => {
    const assignment = resolveRequestAssignment(request, donors, store, {
      allowCreate,
    });
    if (
      assignment &&
      assignmentFingerprint(store[request.id]) !== assignmentFingerprint(assignment)
    ) {
      store[request.id] = assignment;
      changed = true;
      if (allowCreate) void persistAssignment(request.id, assignment);
    }
    return {
      ...request,
      assignment: assignment ?? store[request.id],
      status:
        assignment?.status === "accepted" && isActiveRequestStatus(request.status)
          ? "donor_accepted"
          : request.status,
    };
  });
  if (changed) writeStore(store);
  return resolved;
}

export async function startAssignmentForRequest(
  request: BloodRequest,
  donors: DonorProfile[],
) {
  const [next] = await syncAssignments([request], donors);
  notifyLive();
  return next;
}

export async function respondToAssignment(
  requestId: string,
  donorId: string,
  action: "accept" | "decline",
  requestOwnerId?: string,
) {
  if (requestOwnerId && requestOwnerId === donorId) return;

  await fetchRemoteStore(true);
  const store = readMergedStore();
  const current = store[requestId];
  if (!current || current.donorId !== donorId || current.status !== "pending") {
    return;
  }

  if (action === "accept") {
    store[requestId] = { ...current, status: "accepted" };
    writeStore(store);
    await persistAssignment(requestId, store[requestId]);
    await persistRequestStatus(requestId, "donor_accepted");
    notifyLive();
    return;
  }

  store[requestId] = {
    ...current,
    status: "declined",
    declinedDonorIds: [...new Set([...current.declinedDonorIds, donorId])],
  };
  writeStore(store);
  await persistAssignment(requestId, store[requestId]);
  await persistRequestStatus(requestId, "matching");
  notifyLive();
}

const assignmentListeners = new Set<() => void>();
let assignmentChannel: ReturnType<
  NonNullable<ReturnType<typeof tryCreateClient>>["channel"]
> | null = null;

function notifyAssignmentListeners() {
  for (const listener of assignmentListeners) listener();
}

function ensureAssignmentChannel() {
  if (assignmentChannel || !canUseRemoteAssignments()) return;
  const supabase = tryCreateClient();
  if (!supabase || !isSupabaseConfigured()) return;

  assignmentChannel = supabase
    .channel(`request_assignments_live_${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "request_assignments" },
      (payload) => {
        const eventType = payload.eventType;
        const row = (
          eventType === "DELETE" ? payload.old : payload.new
        ) as Record<string, unknown> | null;
        const requestId = String(row?.request_id ?? "");
        if (requestId) {
          if (eventType === "DELETE") {
            const next = { ...remoteCache };
            delete next[requestId];
            remoteCache = next;
          } else if (row) {
            const assignment = toAssignment(row);
            if (assignment) {
              remoteCache = { ...remoteCache, [requestId]: assignment };
            }
          }
        }
        notifyAssignmentListeners();
        void fetchRemoteStore(true).then(() => notifyAssignmentListeners());
      },
    )
    .subscribe();
}

function releaseAssignmentChannel() {
  if (assignmentListeners.size > 0 || !assignmentChannel) return;
  const supabase = tryCreateClient();
  if (supabase) void supabase.removeChannel(assignmentChannel);
  assignmentChannel = null;
}

export function subscribeAssignments(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const onLocal = () => onChange();
  window.addEventListener(ASSIGNMENT_EVENT, onLocal);
  window.addEventListener("storage", onLocal);

  assignmentListeners.add(onChange);
  ensureAssignmentChannel();

  return () => {
    window.removeEventListener(ASSIGNMENT_EVENT, onLocal);
    window.removeEventListener("storage", onLocal);
    assignmentListeners.delete(onChange);
    releaseAssignmentChannel();
  };
}
