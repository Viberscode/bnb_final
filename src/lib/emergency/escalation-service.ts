import { donorMatchesRequest, neededBloodGroups } from "@/lib/blood-compatibility";
import {
  POST_ACCEPT_LIVE_MS,
  donorDistanceKm,
  isOwnDonor,
} from "@/lib/donor-assignment";
import { emergencyConfig, isTwilioVoiceConfigured } from "@/lib/emergency/config";
import { emergencyLog } from "@/lib/emergency/log";
import {
  escalationShouldStop,
  rankDonorsForEmergencyCall,
  shouldSendUrgentSms,
  shouldStartVoiceEscalation,
} from "@/lib/emergency/priority-donor-queue";
import type {
  EmergencyCallStatus,
  EscalationPublicStatus,
  EscalationStatus,
  VerificationStatus,
} from "@/lib/emergency/types";
import {
  getVoiceCallService,
  sendUrgentSms,
} from "@/lib/emergency/voice-call-service";
import { isActiveRequestStatus } from "@/lib/live-requests";
import { createServiceClient } from "@/lib/supabase/service";
import type { BloodGroup, BloodRequest, DonorProfile, UrgencyLevel } from "@/types";
import { randomUUID } from "crypto";

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

function siteOrigin(fallback: string) {
  return emergencyConfig.siteUrl || fallback;
}

function mapDonor(row: Record<string, unknown>): DonorProfile {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? "Donor"),
    bloodGroup: row.blood_group as BloodGroup,
    phone: String(row.phone ?? ""),
    email: row.email ? String(row.email) : undefined,
    city: String(row.city ?? ""),
    area: String(row.area ?? ""),
    lat: typeof row.lat === "number" ? row.lat : undefined,
    lng: typeof row.lng === "number" ? row.lng : undefined,
    available: row.available !== false,
    donationsCompleted: Number(row.donations_completed ?? 0),
    trustScore: Number(row.trust_score ?? 72),
    livesHelped: Number(row.lives_helped ?? 0),
    avgResponseMinutes: Number(row.avg_response_minutes ?? 14),
    joinedAt: String(row.joined_at ?? new Date().toISOString()),
    emergencyVoiceCalls: row.emergency_voice_calls === true,
    phoneVerified: row.phone_verified !== false,
  };
}

function mapRequest(row: Record<string, unknown>): BloodRequest {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    bloodGroup: row.blood_group as BloodGroup,
    urgency: row.urgency as UrgencyLevel,
    hospitalId: String(row.hospital_id),
    hospitalName: String(row.hospital_name),
    hospitalArea: String(row.hospital_area),
    contactName: String(row.contact_name),
    phone: String(row.phone ?? ""),
    units: Number(row.units ?? 1),
    status: row.status as BloodRequest["status"],
    createdAt: String(row.created_at),
    bloodGroups: (row.blood_groups as BloodGroup[] | null) ?? undefined,
    verificationStatus: (row.verification_status as VerificationStatus) ?? "pending",
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
  };
}

async function loadRequest(client: ServiceClient, requestId: string) {
  const { data, error } = await client
    .from("blood_requests")
    .select(
      "id, user_id, blood_group, blood_groups, urgency, hospital_id, hospital_name, hospital_area, contact_name, phone, units, status, created_at, verification_status, verified_at",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRequest(data as Record<string, unknown>);
}

async function loadDonors(client: ServiceClient, request: BloodRequest) {
  const { data } = await client
    .from("donor_profiles")
    .select(
      "id, full_name, blood_group, phone, email, city, area, lat, lng, available, donations_completed, trust_score, lives_helped, avg_response_minutes, joined_at, emergency_voice_calls, phone_verified",
    )
    .eq("available", true);
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapDonor)
    .filter(
      (donor) =>
        !isOwnDonor(request, donor) &&
        donorMatchesRequest(donor.bloodGroup, request),
    );
}

async function loadAttempts(client: ServiceClient, requestId: string) {
  const { data } = await client
    .from("emergency_call_attempts")
    .select(
      "id, donor_id, status, response, attempt_number, provider_call_sid, initiated_at, completed_at, answered_at",
    )
    .eq("request_id", requestId)
    .order("initiated_at", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    donor_id: string;
    status: EmergencyCallStatus;
    response: string | null;
    attempt_number: number;
    provider_call_sid: string | null;
    initiated_at: string;
    completed_at: string | null;
    answered_at: string | null;
  }>;
}

async function acquireLock(client: ServiceClient, requestId: string) {
  const token = randomUUID();
  const until = new Date(Date.now() + 30_000).toISOString();
  const nowIso = new Date().toISOString();
  const { data } = await client
    .from("emergency_escalations")
    .update({ lock_token: token, locked_until: until, updated_at: nowIso })
    .eq("request_id", requestId)
    .or(`lock_token.is.null,locked_until.lt.${nowIso}`)
    .select("request_id")
    .maybeSingle();
  if (!data) return null;
  return token;
}

async function releaseLock(client: ServiceClient, requestId: string, token: string) {
  await client
    .from("emergency_escalations")
    .update({ lock_token: null, locked_until: null, updated_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .eq("lock_token", token);
}

async function ensureEscalationRow(client: ServiceClient, request: BloodRequest) {
  await client.from("emergency_escalations").upsert(
    {
      request_id: request.id,
      severity: request.urgency,
      verification_status: request.verificationStatus ?? "pending",
      max_donors_to_call: emergencyConfig.maxDonorsToCall,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "request_id" },
  );
}

async function acceptDonorForRequest(
  client: ServiceClient,
  request: BloodRequest,
  donor: DonorProfile,
) {
  const now = Date.now();
  const assignment = {
    request_id: request.id,
    donor_id: donor.id,
    donor_name: donor.fullName,
    blood_group: donor.bloodGroup,
    donations_completed: donor.donationsCompleted,
    distance_km: donorDistanceKm(donor, request),
    status: "accepted",
    assigned_at: new Date(now).toISOString(),
    expires_at: new Date(now + POST_ACCEPT_LIVE_MS).toISOString(),
    declined_donor_ids: [],
  };
  let { error } = await client.from("request_assignments").upsert(assignment, {
    onConflict: "request_id",
  });
  if (error && /eligible_donor_ids|updated_at/i.test(error.message)) {
    const { eligible_donor_ids: _e, ...core } = assignment as typeof assignment & {
      eligible_donor_ids?: string[];
    };
    ({ error } = await client.from("request_assignments").upsert(core, {
      onConflict: "request_id",
    }));
  }
  await client
    .from("blood_requests")
    .update({ status: "donor_accepted" })
    .eq("id", request.id);
  await client
    .from("emergency_escalations")
    .update({
      escalation_status: "completed",
      current_donor_id: donor.id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("request_id", request.id);
  emergencyLog("donor_accepted", { requestId: request.id, donorId: donor.id });
}

export async function routeVerifiedRequestNotifications(
  requestId: string,
  origin: string,
) {
  const client = createServiceClient();
  if (!client) {
    emergencyLog("route_skipped", { requestId, reason: "no_service_role" });
    return;
  }
  const request = await loadRequest(client, requestId);
  if (!request) return;
  if (request.verificationStatus !== "verified") return;

  if (shouldSendUrgentSms({
    urgency: request.urgency,
    verificationStatus: request.verificationStatus ?? "pending",
  })) {
    const donors = await loadDonors(client, request);
    const groups = neededBloodGroups(request).join(", ");
    const body = `BloodNearby URGENT: ${groups} needed at ${request.hospitalName}. Open ${siteOrigin(origin)}/invite/${request.id}`;
    let sent = 0;
    for (const donor of donors.slice(0, 24)) {
      if (!donor.phone) continue;
      const ok = await sendUrgentSms(donor.phone, body);
      if (ok) sent += 1;
    }
    emergencyLog("urgent_sms_batch", { requestId, sent });
  }

  if (
    shouldStartVoiceEscalation({
      urgency: request.urgency,
      verificationStatus: request.verificationStatus,
      requestStatus: request.status,
    })
  ) {
    await processEmergencyEscalation(requestId, origin);
  }
}

export async function verifyBloodRequest(requestId: string, verifierUserId: string) {
  const client = createServiceClient();
  if (!client) throw new Error("Server configuration missing service role.");
  const { data: ngo } = await client
    .from("ngo_profiles")
    .select("id")
    .eq("id", verifierUserId)
    .maybeSingle();
  if (!ngo) throw new Error("Only registered NGO/hospital partners can verify requests.");

  const { data, error } = await client
    .from("blood_requests")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: verifierUserId,
    })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Could not verify request.");

  emergencyLog("request_verified", { requestId, verifierUserId });
  return data;
}

export async function processEmergencyEscalation(requestId: string, origin: string) {
  const client = createServiceClient();
  if (!client) return { ok: false, reason: "no_service_role" as const };

  const request = await loadRequest(client, requestId);
  if (!request) return { ok: false, reason: "not_found" as const };

  if (
    !shouldStartVoiceEscalation({
      urgency: request.urgency,
      verificationStatus: request.verificationStatus ?? "pending",
      requestStatus: request.status,
    })
  ) {
    return { ok: false, reason: "not_eligible" as const };
  }

  await ensureEscalationRow(client, request);
  const lock = await acquireLock(client, requestId);
  if (!lock) return { ok: false, reason: "locked" as const };

  try {
    const { data: escalation } = await client
      .from("emergency_escalations")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (escalation?.escalation_status === "completed") {
      return { ok: true, reason: "already_completed" as const };
    }

    const attempts = await loadAttempts(client, requestId);
    if (attempts.some((row) => row.status === "ACCEPTED")) {
      return { ok: true, reason: "donor_found" as const };
    }

    if (
      attempts.some((row) => ["QUEUED", "CALLING", "ANSWERED"].includes(row.status))
    ) {
      return { ok: true, reason: "call_in_progress" as const };
    }

    const lastFinished = attempts.find(
      (row) => row.completed_at && row.status !== "ACCEPTED",
    );
    if (
      lastFinished?.completed_at &&
      Date.now() - new Date(lastFinished.completed_at).getTime() <
        emergencyConfig.delayBetweenCallsSeconds * 1000
    ) {
      return { ok: true, reason: "delay_between_calls" as const };
    }

    const attemptsByDonor: Record<string, number> = {};
    const declined: string[] = [];
    const callbacks: string[] = [];
    for (const row of attempts) {
      attemptsByDonor[row.donor_id] = (attemptsByDonor[row.donor_id] ?? 0) + 1;
      if (row.response === "DECLINED" || row.status === "DECLINED") {
        declined.push(row.donor_id);
      }
      if (
        row.response === "CALL_BACK_REQUESTED" ||
        row.status === "CALL_BACK_REQUESTED"
      ) {
        callbacks.push(row.donor_id);
      }
    }

    const donors = await loadDonors(client, request);
    const ranked = rankDonorsForEmergencyCall(request, donors, {
      declinedDonorIds: declined,
      callbackDonorIds: callbacks,
      attemptsByDonor,
      maxAttemptsPerDonor: emergencyConfig.maxAttemptsPerDonor,
    });

    const donorsCalled = Number(escalation?.donors_called_count ?? 0);
    if (
      escalationShouldStop({
        requestStatus: request.status,
        donorsCalled,
        maxDonorsToCall: emergencyConfig.maxDonorsToCall,
        rankedRemaining: ranked.length,
      })
    ) {
      await client
        .from("emergency_escalations")
        .update({
          escalation_status: "failed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("request_id", requestId);
      emergencyLog("escalation_completed", {
        requestId,
        result: ranked.length ? "max_attempts" : "no_eligible_donors",
      });
      return { ok: true, reason: "exhausted" as const };
    }

    const nextDonor = ranked[0];
    if (!nextDonor) {
      await client
        .from("emergency_escalations")
        .update({
          escalation_status: "failed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("request_id", requestId);
      return { ok: true, reason: "no_donors" as const };
    }

    if (!isTwilioVoiceConfigured()) {
      emergencyLog("voice_provider_unavailable", { requestId });
      await client
        .from("emergency_escalations")
        .update({
          last_error: "Twilio voice not configured",
          updated_at: new Date().toISOString(),
        })
        .eq("request_id", requestId);
      return { ok: false, reason: "voice_unconfigured" as const };
    }

    const attemptNumber = (attemptsByDonor[nextDonor.id] ?? 0) + 1;
    const { data: attemptRow, error: attemptError } = await client
      .from("emergency_call_attempts")
      .insert({
        request_id: requestId,
        donor_id: nextDonor.id,
        attempt_number: attemptNumber,
        status: "QUEUED",
      })
      .select("id")
      .single();
    if (attemptError || !attemptRow) {
      emergencyLog("call_attempt_insert_failed", {
        requestId,
        message: attemptError?.message,
      });
      return { ok: false, reason: "attempt_insert_failed" as const };
    }

    const base = siteOrigin(origin);
    const twimlUrl = `${base}/api/twilio/voice/twiml?requestId=${encodeURIComponent(requestId)}&donorId=${encodeURIComponent(nextDonor.id)}&attemptId=${encodeURIComponent(attemptRow.id)}`;
    const statusUrl = `${base}/api/twilio/voice/status?requestId=${encodeURIComponent(requestId)}&attemptId=${encodeURIComponent(attemptRow.id)}`;

    try {
      const voice = getVoiceCallService();
      const placed = await voice.initiateCall({
        toPhone: nextDonor.phone,
        twimlUrl,
        statusCallbackUrl: statusUrl,
        timeoutSeconds: emergencyConfig.callTimeoutSeconds,
      });
      await client
        .from("emergency_call_attempts")
        .update({
          status: "CALLING",
          provider_call_sid: placed.callSid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attemptRow.id);
      await client
        .from("emergency_escalations")
        .update({
          escalation_status: "active",
          current_donor_id: nextDonor.id,
          current_attempt_id: attemptRow.id,
          donors_called_count: donorsCalled + 1,
          started_at: escalation?.started_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("request_id", requestId);
      emergencyLog("donor_selected", {
        requestId,
        donorId: nextDonor.id,
        attemptId: attemptRow.id,
      });
      return { ok: true, reason: "calling" as const };
    } catch (err) {
      await client
        .from("emergency_call_attempts")
        .update({
          status: "FAILED",
          failure_reason: err instanceof Error ? err.message : "call_failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptRow.id);
      emergencyLog("call_failed", { requestId, donorId: nextDonor.id });
      return { ok: false, reason: "call_failed" as const };
    }
  } finally {
    await releaseLock(client, requestId, lock);
  }
}

export async function handleEmergencyDtmf(input: {
  requestId: string;
  donorId: string;
  attemptId: string;
  digits: string;
}) {
  const client = createServiceClient();
  if (!client) return { ok: false as const, message: "Unavailable." };

  const request = await loadRequest(client, input.requestId);
  if (!request || !isActiveRequestStatus(request.status)) {
    return { ok: false as const, message: "Request not active." };
  }

  const { data: attempt } = await client
    .from("emergency_call_attempts")
    .select("*")
    .eq("id", input.attemptId)
    .eq("request_id", input.requestId)
    .eq("donor_id", input.donorId)
    .maybeSingle();
  if (!attempt) return { ok: false as const, message: "Attempt not found." };
  if (attempt.status === "ACCEPTED") {
    return { ok: true as const, message: "Already accepted." };
  }

  const digit = input.digits.trim();
  if (digit === "1") {
    await client
      .from("emergency_call_attempts")
      .update({
        status: "ACCEPTED",
        response: "ACCEPTED",
        answered_at: attempt.answered_at ?? new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.attemptId);

    const { data: donorRow } = await client
      .from("donor_profiles")
      .select(
        "id, full_name, blood_group, phone, city, area, lat, lng, available, donations_completed, trust_score, lives_helped, avg_response_minutes, joined_at, emergency_voice_calls, phone_verified",
      )
      .eq("id", input.donorId)
      .maybeSingle();
    if (donorRow) {
      await acceptDonorForRequest(
        client,
        request,
        mapDonor(donorRow as Record<string, unknown>),
      );
    }
    emergencyLog("dtmf_accepted", {
      requestId: input.requestId,
      donorId: input.donorId,
    });
    return {
      ok: true as const,
      message: "Thank you. You are marked as available for this emergency request.",
    };
  }

  if (digit === "2") {
    await client
      .from("emergency_call_attempts")
      .update({
        status: "DECLINED",
        response: "DECLINED",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.attemptId);
    emergencyLog("dtmf_declined", {
      requestId: input.requestId,
      donorId: input.donorId,
    });
    return {
      ok: true as const,
      message: "Thank you. We will contact the next donor.",
      advance: true as const,
    };
  }

  if (digit === "3") {
    await client
      .from("emergency_call_attempts")
      .update({
        status: "CALL_BACK_REQUESTED",
        response: "CALL_BACK_REQUESTED",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.attemptId);
    emergencyLog("dtmf_callback", {
      requestId: input.requestId,
      donorId: input.donorId,
    });
    return {
      ok: true as const,
      message: "Thank you. We will call you back later if needed.",
      advance: true as const,
    };
  }

  return { ok: true as const, message: "Invalid option.", advance: true as const };
}

export async function handleEmergencyCallStatus(input: {
  requestId: string;
  attemptId: string;
  callStatus: string;
  callSid?: string;
  origin: string;
}) {
  const client = createServiceClient();
  if (!client) return;

  const { data: attempt } = await client
    .from("emergency_call_attempts")
    .select("*")
    .eq("id", input.attemptId)
    .eq("request_id", input.requestId)
    .maybeSingle();
  if (!attempt) return;
  if (attempt.status === "ACCEPTED") {
    emergencyLog("status_ignored_accepted", {
      requestId: input.requestId,
      attemptId: input.attemptId,
    });
    return;
  }

  const status = input.callStatus.toLowerCase();
  let mapped: EmergencyCallStatus | null = null;
  if (status === "answered" || status === "in-progress") mapped = "ANSWERED";
  if (status === "completed" && attempt.status !== "ACCEPTED") mapped = "COMPLETED";
  if (status === "no-answer") mapped = "NO_ANSWER";
  if (status === "busy") mapped = "BUSY";
  if (status === "failed" || status === "canceled") mapped = "FAILED";

  if (mapped) {
    await client
      .from("emergency_call_attempts")
      .update({
        status: mapped,
        provider_call_sid: input.callSid ?? attempt.provider_call_sid,
        answered_at:
          mapped === "ANSWERED"
            ? attempt.answered_at ?? new Date().toISOString()
            : attempt.answered_at,
        completed_at: ["NO_ANSWER", "BUSY", "FAILED", "COMPLETED"].includes(mapped)
          ? new Date().toISOString()
          : attempt.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.attemptId)
      .neq("status", "ACCEPTED");
    emergencyLog("call_status", {
      requestId: input.requestId,
      attemptId: input.attemptId,
      callStatus: mapped,
    });
  }

  if (["no-answer", "busy", "failed", "completed"].includes(status)) {
    const { data: fresh } = await client
      .from("emergency_call_attempts")
      .select("status")
      .eq("id", input.attemptId)
      .maybeSingle();
    if (fresh?.status !== "ACCEPTED") {
      await processEmergencyEscalation(input.requestId, input.origin);
    }
  }
}

export async function fetchEscalationPublicStatus(
  requestId: string,
): Promise<EscalationPublicStatus | null> {
  const client = createServiceClient();
  if (!client) return null;
  const request = await loadRequest(client, requestId);
  if (!request) return null;
  const { data: escalation } = await client
    .from("emergency_escalations")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  const attempts = await loadAttempts(client, requestId);
  const accepted = attempts.find((row) => row.status === "ACCEPTED");

  const queue = attempts.slice(0, 6).map((row, index) => ({
    donorId: row.donor_id,
    label: `Donor ${index + 1}`,
    state:
      row.status === "ACCEPTED"
        ? ("accepted" as const)
        : row.status === "CALLING"
          ? ("calling" as const)
          : row.status === "DECLINED"
            ? ("declined" as const)
            : row.status === "NO_ANSWER"
              ? ("no_answer" as const)
              : row.status === "FAILED"
                ? ("failed" as const)
                : ("queued" as const),
  }));

  let message: string | undefined;
  if (accepted) message = "DONOR FOUND — donor accepted the emergency request.";
  else if ((escalation?.escalation_status as EscalationStatus) === "failed") {
    message = "NO ELIGIBLE DONORS AVAILABLE";
  }

  return {
    requestId,
    severity: request.urgency,
    verificationStatus: request.verificationStatus ?? "pending",
    escalationStatus: (escalation?.escalation_status as EscalationStatus) ?? "idle",
    callsMade: Number(escalation?.donors_called_count ?? 0),
    responses: Number(escalation?.responses_count ?? 0),
    donorFound: Boolean(accepted),
    queue,
    message,
  };
}

export async function cancelEmergencyEscalation(requestId: string) {
  const client = createServiceClient();
  if (!client) return;
  await client
    .from("emergency_escalations")
    .update({
      escalation_status: "cancelled",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("request_id", requestId);
  emergencyLog("escalation_cancelled", { requestId });
}
