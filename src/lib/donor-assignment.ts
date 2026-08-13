import { DEMO_HOSPITALS } from "@/data/demo";
import { donorMatchesRequest } from "@/lib/blood-compatibility";
import { isActiveRequestStatus, urgencyRank } from "@/lib/live-requests";
import type { BloodRequest, DonorAssignment, DonorProfile } from "@/types";

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
  const distance =
    donorDistanceKm(a, request) - donorDistanceKm(b, request);
  if (Math.abs(distance) > 0.05) return distance;
  return b.donationsCompleted - a.donationsCompleted;
}

export function rankRequestsForDonor(
  requests: BloodRequest[],
  donor: DonorProfile,
): BloodRequest[] {
  return [...requests]
    .filter((request) => donorMatchesRequest(donor.bloodGroup, request))
    .sort((a, b) => {
      const urgency = compareRequestsByPriority(a, b);
      if (urgency !== 0) return urgency;
      return donorDistanceKm(donor, a) - donorDistanceKm(donor, b);
    });
}

/**
 * Assign one available compatible donor per open request.
 * 1. Requests queued by urgency, then wait time
 * 2. Among candidates, nearest donor wins
 * 3. Equal distance → more successful donations wins
 */
export function assignDonorsToRequests(
  requests: BloodRequest[],
  donors: DonorProfile[],
): Map<string, DonorAssignment> {
  const assignments = new Map<string, DonorAssignment>();
  const taken = new Set<string>();
  const available = donors.filter((donor) => donor.available);
  const queue = [...requests]
    .filter((request) => isActiveRequestStatus(request.status))
    .sort(compareRequestsByPriority);

  for (const request of queue) {
    const candidates = available
      .filter(
        (donor) =>
          !taken.has(donor.id) &&
          donorMatchesRequest(donor.bloodGroup, request),
      )
      .sort((a, b) => compareDonorsForRequest(a, b, request));

    const winner = candidates[0];
    if (!winner) continue;

    taken.add(winner.id);
    assignments.set(request.id, {
      donorId: winner.id,
      donorName: winner.fullName,
      bloodGroup: winner.bloodGroup,
      donationsCompleted: winner.donationsCompleted,
      distanceKm: donorDistanceKm(winner, request),
    });
  }

  return assignments;
}

export function withAssignments(
  requests: BloodRequest[],
  donors: DonorProfile[],
): BloodRequest[] {
  const assignments = assignDonorsToRequests(requests, donors);
  return requests.map((request) => ({
    ...request,
    assignment: assignments.get(request.id),
  }));
}
