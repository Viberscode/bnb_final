import type { UrgencyLevel } from "@/types";
import type { VerificationStatus } from "@/lib/emergency/types";

export function initialVerificationStatus(
  urgency: UrgencyLevel,
): VerificationStatus {
  return urgency === "critical" ? "pending" : "verified";
}
