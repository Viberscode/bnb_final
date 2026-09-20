"use client";

import { useEffect, useState } from "react";
import {
  fetchLiveRequests,
  isActiveRequestStatus,
  isFreshLiveRequest,
  subscribeLiveRequests,
} from "@/lib/live-requests";

export function useHasLiveRequests() {
  const [hasLive, setHasLive] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const rows = await fetchLiveRequests();
      if (active) {
        setHasLive(
          rows.some(
            (request) =>
              isActiveRequestStatus(request.status) &&
              isFreshLiveRequest(request.createdAt),
          ),
        );
      }
    };

    void refresh();
    const unsub = subscribeLiveRequests(() => {
      void refresh();
    });
    const id = window.setInterval(() => {
      void refresh();
    }, 10000);

    return () => {
      active = false;
      unsub();
      window.clearInterval(id);
    };
  }, []);

  return hasLive;
}
