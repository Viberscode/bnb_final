import { useCallback, useEffect, useRef, useState } from "react";
import { distanceKm } from "@/lib/geo";

export type LiveLocationStatus =
  | "loading"
  | "tracking"
  | "denied"
  | "unavailable";

export interface LiveCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

function shouldKeep(
  prev: LiveCoords | null,
  next: LiveCoords,
): LiveCoords {
  if (!prev) return next;
  const movedM = distanceKm(prev.lat, prev.lng, next.lat, next.lng) * 1000;
  if (next.accuracy <= prev.accuracy) return next;
  if (movedM >= 25) return next;
  return prev;
}

/** Real-time device GPS via watchPosition (high accuracy). */
export function useLiveLocation() {
  const [coords, setCoords] = useState<LiveCoords | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>("loading");
  const [watchKey, setWatchKey] = useState(0);
  const latest = useRef<LiveCoords | null>(null);

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    const next = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    const kept = shouldKeep(latest.current, next);
    latest.current = kept;
    setCoords(kept);
    setStatus("tracking");
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    latest.current = null;
    setStatus("loading");

    navigator.geolocation.getCurrentPosition(applyPosition, () => undefined, GPS_OPTIONS);

    const watchId = navigator.geolocation.watchPosition(
      applyPosition,
      (err) => {
        if (latest.current) return;
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("unavailable");
      },
      GPS_OPTIONS,
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [applyPosition, watchKey]);

  function retry() {
    latest.current = null;
    setCoords(null);
    setStatus("loading");
    setWatchKey((key) => key + 1);
  }

  return { coords, status, retry };
}
