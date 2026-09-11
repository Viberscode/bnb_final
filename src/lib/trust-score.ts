import type { DonorActivity } from "@/lib/donor-activity";
import type { DonorProfile } from "@/types";

export type TrustScoreInput = {
  donationsCompleted: number;
  livesHelped: number;
  avgResponseMinutes: number | null;
  available: boolean;
  joinedAt?: string | null;
  phone?: string | null;
  city?: string | null;
  area?: string | null;
  age?: number | null;
  telegramChatId?: string | null;
  criticalCompleted?: number;
  emergencyCompleted?: number;
  rapidCompleted?: number;
  acceptedAssignments?: number;
  noShowPenalty?: number;
};

/** Starting trust for a fully registered, inactive donor. */
export const TRUST_SCORE_BASE = 42;

/**
 * Live trust score (0–100) from donations, urgency saves, response speed,
 * standby status, profile completeness, and recent activity.
 */
export function computeTrustScore(input: TrustScoreInput): number {
  const donations = Math.max(0, input.donationsCompleted);
  const lives = Math.max(0, input.livesHelped);
  const critical = Math.max(0, input.criticalCompleted ?? 0);
  const emergency = Math.max(0, input.emergencyCompleted ?? 0);
  const rapid = Math.max(0, input.rapidCompleted ?? 0);
  const accepts = Math.max(0, input.acceptedAssignments ?? 0);
  const penalty = Math.max(0, input.noShowPenalty ?? 0);

  let score = TRUST_SCORE_BASE;

  // Verified donations carry the most weight
  score += Math.min(28, donations * 7);

  // Lives helped (can exceed donations when multi-patient requests)
  score += Math.min(10, lives * 2);

  // Harder cases + fast replies
  score += Math.min(8, critical * 4);
  score += Math.min(6, Math.max(0, emergency - critical) * 2);
  score += Math.min(6, rapid * 3);

  // Showing up for matches (even before completion) shows reliability
  score += Math.min(5, accepts);

  // On standby right now
  if (input.available) score += 5;

  // Profile completeness
  let completeness = 0;
  if ((input.phone ?? "").replace(/\D/g, "").length >= 10) completeness += 2;
  if ((input.city ?? "").trim()) completeness += 1;
  if ((input.area ?? "").trim()) completeness += 1;
  if (input.age && input.age >= 18) completeness += 1;
  score += completeness;

  // Telegram alerts linked = more active on the network
  if (input.telegramChatId) score += 4;

  // Tenure — consistent presence over months
  if (input.joinedAt) {
    const days = Math.max(
      0,
      (Date.now() - new Date(input.joinedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (Number.isFinite(days)) {
      score += Math.min(6, Math.floor(days / 30));
    }
  }

  // Faster average response → higher trust
  const avg = input.avgResponseMinutes;
  if (avg != null && Number.isFinite(avg) && avg > 0) {
    if (avg <= 8) score += 6;
    else if (avg <= 15) score += 4;
    else if (avg <= 30) score += 2;
    else if (avg <= 60) score += 1;
  }

  score -= Math.min(40, penalty);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function trustInputFromProfile(
  profile: Pick<
    DonorProfile,
    | "donationsCompleted"
    | "livesHelped"
    | "avgResponseMinutes"
    | "available"
    | "joinedAt"
    | "phone"
    | "city"
    | "area"
    | "age"
    | "telegramChatId"
  >,
  activity?: Partial<DonorActivity> | null,
  extras?: { noShowPenalty?: number },
): TrustScoreInput {
  return {
    donationsCompleted: Math.max(
      profile.donationsCompleted,
      activity?.verifiedDonations ?? 0,
    ),
    livesHelped: Math.max(profile.livesHelped, activity?.verifiedDonations ?? 0),
    avgResponseMinutes:
      activity?.avgResponseMinutes ?? profile.avgResponseMinutes ?? null,
    available: profile.available,
    joinedAt: profile.joinedAt,
    phone: profile.phone,
    city: profile.city,
    area: profile.area,
    age: profile.age,
    telegramChatId: profile.telegramChatId,
    criticalCompleted: activity?.criticalCompleted,
    emergencyCompleted: activity?.emergencyCompleted,
    rapidCompleted: activity?.rapidCompleted,
    acceptedAssignments: activity?.acceptedAssignments,
    noShowPenalty: extras?.noShowPenalty,
  };
}

export function trustScoreFor(
  profile: DonorProfile,
  activity?: Partial<DonorActivity> | null,
): number {
  return computeTrustScore(trustInputFromProfile(profile, activity));
}
