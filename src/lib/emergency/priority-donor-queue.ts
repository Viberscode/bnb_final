import {
  compareDonorsForRequest,
  donorDistanceKm,
  isOwnDonor,
} from "@/lib/donor-assignment";
import { donorMatchesRequest } from "@/lib/blood-compatibility";
import type { BloodRequest, DonorProfile, RequestStatus, UrgencyLevel } from "@/types";
import type { VerificationStatus } from "@/lib/emergency/types";

const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  "pending",
  "matching",
  "donor_accepted",
  "donor_enroute",
];

function isActiveRequestStatus(status: RequestStatus) {
  return ACTIVE_REQUEST_STATUSES.includes(status);
}

const NEARBY_DONOR_RADIUS_KM = 25;

function validIndianPhone(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const local = digits.startsWith("91") ? digits.slice(2) : digits;
  return local.length === 10;
}

export function shouldStartVoiceEscalation(input: {
  urgency: UrgencyLevel;
  verificationStatus: VerificationStatus;
  requestStatus: RequestStatus;
  escalationAlreadyCompleted?: boolean;
}): boolean {
  if (input.escalationAlreadyCompleted) return false;
  if (input.verificationStatus !== "verified") return false;
  if (input.urgency !== "critical") return false;
  return isActiveRequestStatus(input.requestStatus);
}

export function shouldSendUrgentSms(input: {
  urgency: UrgencyLevel;
  verificationStatus: VerificationStatus;
}): boolean {
  return input.verificationStatus === "verified" && input.urgency === "urgent";
}

export function rankDonorsForEmergencyCall(
  request: BloodRequest,
  donors: DonorProfile[],
  input: {
    declinedDonorIds: string[];
    callbackDonorIds: string[];
    attemptsByDonor: Record<string, number>;
    maxAttemptsPerDonor: number;
    busyDonorIds?: Set<string>;
  },
): DonorProfile[] {
  const busy = input.busyDonorIds ?? new Set<string>();
  return donors
    .filter((donor) => {
      if (!donor.available) return false;
      if (donor.emergencyVoiceCalls !== true) return false;
      if (!validIndianPhone(donor.phone)) return false;
      if (donor.phoneVerified === false) return false;
      if (isOwnDonor(request, donor)) return false;
      if (!donorMatchesRequest(donor.bloodGroup, request)) return false;
      if (input.declinedDonorIds.includes(donor.id)) return false;
      if (input.callbackDonorIds.includes(donor.id)) return false;
      if (busy.has(donor.id)) return false;
      const attempts = input.attemptsByDonor[donor.id] ?? 0;
      if (attempts >= input.maxAttemptsPerDonor) return false;
      return true;
    })
    .sort((a, b) => {
      const aNear =
        donorDistanceKm(a, request) <= NEARBY_DONOR_RADIUS_KM ? 0 : 1;
      const bNear =
        donorDistanceKm(b, request) <= NEARBY_DONOR_RADIUS_KM ? 0 : 1;
      if (aNear !== bNear) return aNear - bNear;
      return compareDonorsForRequest(a, b, request);
    });
}

export function pickNextRankedDonor(
  ranked: DonorProfile[],
  alreadyCallingDonorId?: string | null,
) {
  if (alreadyCallingDonorId) {
    return ranked.find((donor) => donor.id !== alreadyCallingDonorId) ?? null;
  }
  return ranked[0] ?? null;
}

export function escalationShouldStop(input: {
  requestStatus: RequestStatus;
  acceptedDonorId?: string | null;
  donorsCalled: number;
  maxDonorsToCall: number;
  rankedRemaining: number;
}): boolean {
  if (input.acceptedDonorId) return true;
  if (!isActiveRequestStatus(input.requestStatus)) return true;
  if (input.donorsCalled >= input.maxDonorsToCall) return true;
  if (input.rankedRemaining <= 0) return true;
  return false;
}
