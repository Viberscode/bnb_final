"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AssignedRequesterDetails } from "@/components/request-help/assigned-requester-details";
import {
  isAssignedDonor,
  isOwnDonor,
  respondToAssignment,
  subscribeAssignments,
  syncAssignments,
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
  const [tick, setTick] = useState(0);

  const pool = useMemo(() => {
    if (!donor) return donors;
    return donors.some((item) => item.id === donor.id)
      ? donors
      : [...donors, donor];
  }, [donor, donors]);

  const match = useMemo(() => {
    if (!donor) return null;
    return (
      requests.find(
        (request) =>
          isAssignedDonor(request, donor.id) && !isOwnDonor(request, donor),
      ) ?? null
    );
  }, [requests, donor, tick]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (!user?.id) {
        if (active) {
          setRequests([]);
          setDonor(null);
          setDonors([]);
        }
        return;
      }

      const [rows, profile, nextDonors] = await Promise.all([
        fetchLiveRequests(),
        fetchDonorProfile(user.id),
        fetchAvailableDonors(),
      ]);
      if (!active) return;

      const nextPool =
        profile && !nextDonors.some((item) => item.id === profile.id)
          ? [...nextDonors, profile]
          : nextDonors;

      // Donor clients only consume remote matches — never invent new ones.
      const synced = await syncAssignments(rows, nextPool, {
        allowCreate: false,
      });

      if (!active) return;
      setDonor(profile);
      setDonors(nextDonors);
      setRequests(synced);
      setTick((value) => value + 1);
    };

    void refresh();
    const unsubLive = subscribeLiveRequests(() => {
      void refresh();
    });
    const unsubAssign = subscribeAssignments(() => {
      void refresh();
    });
    const id = window.setInterval(() => {
      void refresh();
    }, 8000);

    return () => {
      active = false;
      unsubLive();
      unsubAssign();
      window.clearInterval(id);
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

  if (!donor || !openRequest || !openKey) return null;

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
        ).then(() => {
          setTick((value) => value + 1);
        });
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
