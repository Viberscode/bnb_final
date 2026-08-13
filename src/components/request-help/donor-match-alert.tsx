"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AssignedRequesterDetails } from "@/components/request-help/assigned-requester-details";
import { useAssignmentEngine } from "@/hooks/use-assignment-engine";
import {
  isOwnDonor,
  respondToAssignment,
  withAssignments,
} from "@/lib/donor-assignment";
import { fetchAvailableDonors, fetchDonorProfile } from "@/lib/donor-profile";
import {
  fetchLiveRequests,
  subscribeLiveRequests,
} from "@/lib/live-requests";
import type { BloodRequest, DonorProfile } from "@/types";

function matchKey(request: BloodRequest) {
  const assignment = request.assignment;
  return `${request.id}|${assignment?.donorId ?? ""}|${assignment?.assignedAt ?? ""}`;
}

function wasDismissed(key: string) {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem("bloodkit-dismissed-match") === key;
}

function rememberDismissed(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("bloodkit-dismissed-match", key);
}

export function DonorMatchAlert() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const pool =
    donor && !donors.some((item) => item.id === donor.id)
      ? [...donors, donor]
      : donors;
  const now = useAssignmentEngine(requests, pool);
  const assigned = useMemo(
    () => withAssignments(requests, pool),
    [requests, pool, now],
  );

  const match = useMemo(() => {
    if (!donor) return null;
    return (
      assigned.find((request) => {
        const assignment = request.assignment;
        return (
          Boolean(assignment?.donorId) &&
          assignment?.donorId === donor.id &&
          (assignment.status === "pending" || assignment.status === "accepted") &&
          !isOwnDonor(request, donor)
        );
      }) ?? null
    );
  }, [assigned, donor]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [rows, profile, nextDonors] = await Promise.all([
        fetchLiveRequests(),
        fetchDonorProfile(user?.id),
        fetchAvailableDonors(),
      ]);
      if (!active) return;
      setRequests(rows);
      setDonor(profile);
      setDonors(nextDonors);
    };
    void refresh();
    const unsub = subscribeLiveRequests(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!match) {
      setOpenKey(null);
      return;
    }
    const key = matchKey(match);
    if (wasDismissed(key)) return;
    setOpenKey(key);
  }, [match]);

  const openRequest =
    match && openKey && matchKey(match) === openKey ? match : null;

  if (!donor || !openRequest) return null;

  return (
    <AssignedRequesterDetails
      request={openRequest}
      onClose={() => {
        rememberDismissed(openKey);
        setOpenKey(null);
      }}
      onAccept={() => {
        void respondToAssignment(
          openRequest.id,
          donor.id,
          "accept",
          openRequest.userId,
        );
      }}
      onDecline={() => {
        rememberDismissed(openKey);
        setOpenKey(null);
        void respondToAssignment(
          openRequest.id,
          donor.id,
          "decline",
          openRequest.userId,
        );
      }}
    />
  );
}
