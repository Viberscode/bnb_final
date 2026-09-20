"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AssignedRequesterDetails } from "@/components/request-help/assigned-requester-details";
import { useDonorLiveCoords } from "@/hooks/use-donor-live-coords";
import { donorMatchesRequest } from "@/lib/blood-compatibility";
import {
  isAssignedDonor,
  isOwnDonor,
  offerAssignmentToDonor,
  respondToAssignment,
  subscribeAssignments,
  syncAssignments,
} from "@/lib/donor-assignment";
import { fetchAvailableDonors, fetchDonorProfile } from "@/lib/donor-profile";
import {
  fetchLiveRequests,
  fetchRequestsAssignedToDonor,
  isActiveRequestStatus,
  subscribeLiveRequests,
} from "@/lib/live-requests";
import type { BloodRequest, DonorProfile } from "@/types";

function matchKey(request: BloodRequest) {
  const assignment = request.assignment;
  return `${request.id}|${assignment?.donorId ?? ""}|${assignment?.assignedAt ?? ""}`;
}

export function DonorMatchAlert() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const closedKeys = useRef(new Set<string>());
  const { coords: liveCoords } = useDonorLiveCoords(donor);

  const pool = useMemo(() => {
    if (!donor) return donors;
    return donors.some((item) => item.id === donor.id)
      ? donors
      : [...donors, donor];
  }, [donor, donors]);

  const match = useMemo(() => {
    if (!donor) return null;
    const live = requests.filter(
      (request) =>
        isActiveRequestStatus(request.status) && !isOwnDonor(request, donor),
    );
    return (
      live.find((request) => isAssignedDonor(request, donor.id)) ??
      live.find((request) =>
        donorMatchesRequest(donor.bloodGroup, request),
      ) ??
      live[0] ??
      null
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

      const [assignedRows, liveRows, profile, nextDonors] = await Promise.all([
        fetchRequestsAssignedToDonor(user.id),
        fetchLiveRequests(),
        fetchDonorProfile(user.id),
        fetchAvailableDonors(),
      ]);
      if (!active) return;

      const byId = new Map<string, BloodRequest>();
      for (const row of [...assignedRows, ...liveRows]) byId.set(row.id, row);
      const rows = [...byId.values()];

      const nextPool =
        profile && !nextDonors.some((item) => item.id === profile.id)
          ? [...nextDonors, profile]
          : nextDonors;

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
    if (!match || !donor) return;
    if (isAssignedDonor(match, donor.id)) return;
    const next = offerAssignmentToDonor(match, donor, { force: true });
    if (next.assignment?.donorId === donor.id) {
      setRequests((rows) =>
        rows.map((row) => (row.id === next.id ? next : row)),
      );
    }
  }, [match?.id, donor?.id]);

  useEffect(() => {
    if (!match) {
      setOpenKey(null);
      return;
    }
    const key = matchKey(match);
    if (closedKeys.current.has(key)) return;
    setOpenKey(key);
  }, [match]);

  const openRequest =
    match && openKey && matchKey(match) === openKey ? match : null;

  if (!donor || !openRequest || !openKey) return null;

  return (
    <AssignedRequesterDetails
      request={openRequest}
      donorCoords={{
        lat: liveCoords?.lat ?? donor.lat,
        lng: liveCoords?.lng ?? donor.lng,
      }}
      onClose={() => {
        closedKeys.current.add(openKey);
        setOpenKey(null);
      }}
      onAccept={() => {
        const offered = offerAssignmentToDonor(openRequest, donor, {
          force: true,
        });
        void respondToAssignment(
          offered.id,
          donor.id,
          "accept",
          offered.userId,
        ).then(() => {
          setTick((value) => value + 1);
        });
      }}
      onDecline={() => {
        closedKeys.current.add(openKey);
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
