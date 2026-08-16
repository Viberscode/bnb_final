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
  options?: { allowCreate?: boolean },
) {
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef({
    requests,
    donors,
    allowCreate: options?.allowCreate !== false,
  });
  latest.current = {
    requests,
    donors,
    allowCreate: options?.allowCreate !== false,
  };

  useEffect(() => {
    const sync = () =>
      syncAssignments(latest.current.requests, latest.current.donors, {
        allowCreate: latest.current.allowCreate,
      });

    void sync();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => {
      void sync();
    }, 4000);
    const unsub = subscribeAssignments(() => {
      void sync();
      setNow(Date.now());
    });
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
      unsub();
    };
  }, []);

  return now;
}
