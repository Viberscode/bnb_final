"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { distanceKm } from "@/lib/geo";

export type LiveLocationStatus =
  | "idle"
  | "loading"
  | "tracking"
  | "denied"
  | "unavailable";

export interface LiveCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

const QUICK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 8_000,
};

const PRECISE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
};

function shouldKeep(prev: LiveCoords | null, next: LiveCoords): LiveCoords {
  if (!prev) return next;
  const movedM = distanceKm(prev.lat, prev.lng, next.lat, next.lng) * 1000;
  if (next.accuracy <= prev.accuracy) return next;
  if (movedM >= 25) return next;
  return prev;
}

function toCoords(pos: GeolocationPosition): LiveCoords {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

function locateOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/** Real-time device GPS via getCurrentPosition + watchPosition. */
export function useLiveLocation(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [coords, setCoords] = useState<LiveCoords | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>(
    enabled ? "loading" : "idle",
  );
  const [watchKey, setWatchKey] = useState(0);
  const latest = useRef<LiveCoords | null>(null);

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    const next = toCoords(pos);
    const kept = shouldKeep(latest.current, next);
    latest.current = kept;
    setCoords(kept);
    setStatus("tracking");
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;
    latest.current = null;
    setStatus("loading");

    const fail = (err?: GeolocationPositionError) => {
      if (cancelled || latest.current) return;
      if (err && err.code === err.PERMISSION_DENIED) setStatus("denied");
      else setStatus("unavailable");
    };

    void (async () => {
      try {
        const quick = await locateOnce(QUICK_OPTIONS);
        if (cancelled) return;
        applyPosition(quick);
      } catch {
        try {
          const precise = await locateOnce(PRECISE_OPTIONS);
          if (cancelled) return;
          applyPosition(precise);
        } catch (err) {
          fail(err as GeolocationPositionError);
        }
      }

      if (cancelled) return;

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!cancelled) applyPosition(pos);
        },
        (err) => {
          if (latest.current) return;
          fail(err);
        },
        PRECISE_OPTIONS,
      );
    })();

    const watchdog = window.setTimeout(() => {
      if (!cancelled && !latest.current) {
        setStatus((prev) => (prev === "loading" ? "unavailable" : prev));
      }
    }, 22_000);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [applyPosition, enabled, watchKey]);

  function retry() {
    latest.current = null;
    setCoords(null);
    setStatus("loading");
    setWatchKey((key) => key + 1);
  }

  return { coords, status, retry };
}
