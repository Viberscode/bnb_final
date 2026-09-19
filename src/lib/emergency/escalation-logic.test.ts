import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escalationShouldStop,
  rankDonorsForEmergencyCall,
  shouldSendUrgentSms,
  shouldStartVoiceEscalation,
} from "./priority-donor-queue";
import { initialVerificationStatus } from "./verification";
import type { BloodRequest, DonorProfile } from "../../types";

const baseRequest: BloodRequest = {
  id: "req-1",
  bloodGroup: "O+",
  urgency: "critical",
  hospitalId: "h1",
  hospitalName: "City Hospital",
  hospitalArea: "Sector 1",
  contactName: "Patient",
  phone: "+919999999999",
  units: 1,
  status: "matching",
  createdAt: new Date().toISOString(),
  verificationStatus: "verified",
};

const donor = (id: string, overrides: Partial<DonorProfile> = {}): DonorProfile => ({
  id,
  fullName: `Donor ${id}`,
  bloodGroup: "O+",
  phone: "+919876543210",
  city: "Chandigarh",
  area: "Sector 1",
  available: true,
  donationsCompleted: 2,
  trustScore: 80,
  livesHelped: 2,
  avgResponseMinutes: 10,
  joinedAt: new Date().toISOString(),
  emergencyVoiceCalls: true,
  phoneVerified: true,
  ...overrides,
});

describe("escalation routing", () => {
  it("planned auto-verifies but does not start voice", () => {
    assert.equal(initialVerificationStatus("planned"), "verified");
    assert.equal(
      shouldStartVoiceEscalation({
        urgency: "planned",
        verificationStatus: "verified",
        requestStatus: "matching",
      }),
      false,
    );
  });

  it("urgent verified request does not start voice but may SMS", () => {
    assert.equal(
      shouldStartVoiceEscalation({
        urgency: "urgent",
        verificationStatus: "verified",
        requestStatus: "matching",
      }),
      false,
    );
    assert.equal(
      shouldSendUrgentSms({ urgency: "urgent", verificationStatus: "verified" }),
      true,
    );
  });

  it("critical verified active request starts voice escalation", () => {
    assert.equal(initialVerificationStatus("critical"), "pending");
    assert.equal(
      shouldStartVoiceEscalation({
        urgency: "critical",
        verificationStatus: "verified",
        requestStatus: "matching",
      }),
      true,
    );
  });

  it("unverified critical request cannot start voice", () => {
    assert.equal(
      shouldStartVoiceEscalation({
        urgency: "critical",
        verificationStatus: "pending",
        requestStatus: "matching",
      }),
      false,
    );
  });
});

describe("donor queue", () => {
  it("ranks first eligible donor and skips opt-out", () => {
    const ranked = rankDonorsForEmergencyCall(
      baseRequest,
      [donor("d2", { emergencyVoiceCalls: false }), donor("d1")],
      {
        declinedDonorIds: [],
        callbackDonorIds: [],
        attemptsByDonor: {},
        maxAttemptsPerDonor: 2,
      },
    );
    assert.equal(ranked[0]?.id, "d1");
    assert.equal(ranked.some((row) => row.id === "d2"), false);
  });

  it("declined donor is skipped", () => {
    const ranked = rankDonorsForEmergencyCall(
      baseRequest,
      [donor("d1"), donor("d2")],
      {
        declinedDonorIds: ["d1"],
        callbackDonorIds: [],
        attemptsByDonor: {},
        maxAttemptsPerDonor: 2,
      },
    );
    assert.equal(ranked[0]?.id, "d2");
  });

  it("respects max attempts per donor", () => {
    const ranked = rankDonorsForEmergencyCall(baseRequest, [donor("d1")], {
      declinedDonorIds: [],
      callbackDonorIds: [],
      attemptsByDonor: { d1: 2 },
      maxAttemptsPerDonor: 2,
    });
    assert.equal(ranked.length, 0);
  });

  it("stops when donor accepted", () => {
    assert.equal(
      escalationShouldStop({
        requestStatus: "matching",
        acceptedDonorId: "d1",
        donorsCalled: 1,
        maxDonorsToCall: 5,
        rankedRemaining: 3,
      }),
      true,
    );
  });

  it("stops at max donor call limit", () => {
    assert.equal(
      escalationShouldStop({
        requestStatus: "matching",
        donorsCalled: 5,
        maxDonorsToCall: 5,
        rankedRemaining: 2,
      }),
      true,
    );
  });
});
