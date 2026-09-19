export type VerificationStatus = "pending" | "verified" | "rejected";

export type EscalationStatus =
  | "idle"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

export type EmergencyCallStatus =
  | "QUEUED"
  | "CALLING"
  | "ANSWERED"
  | "ACCEPTED"
  | "DECLINED"
  | "CALL_BACK_REQUESTED"
  | "NO_ANSWER"
  | "BUSY"
  | "FAILED"
  | "COMPLETED";

export type EmergencyCallResponse =
  | "ACCEPTED"
  | "DECLINED"
  | "CALL_BACK_REQUESTED";

export type EscalationPublicStatus = {
  requestId: string;
  severity: string;
  verificationStatus: VerificationStatus;
  escalationStatus: EscalationStatus;
  callsMade: number;
  responses: number;
  donorFound: boolean;
  queue: Array<{
    donorId: string;
    label: string;
    state: "calling" | "queued" | "accepted" | "declined" | "no_answer" | "failed";
  }>;
  message?: string;
};
