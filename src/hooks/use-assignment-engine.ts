"use client";

import { useEffect, useRef, useState } from "react";
import {
  subscribeAssignments,
  syncAssignments,
} from "@/lib/donor-assignment";
import type { BloodRequest, DonorProfile } from "@/types";

export function useAssignmentEngine(
  requests: BloodRequest[],
  donors: DonorProfile[],
) {
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef({ requests, donors });
  latest.current = { requests, donors };

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      void syncAssignments(latest.current.requests, latest.current.donors);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    const unsub = subscribeAssignments(() => {
      void syncAssignments(latest.current.requests, latest.current.donors);
      setNow(Date.now());
    });
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, []);

  return now;
}
