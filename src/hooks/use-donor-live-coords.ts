"use client";

import { useEffect, useState } from "react";
import { useLiveLocation } from "@/hooks/use-live-location";

const STORAGE_KEY = "bloodkit-donor-coords";

function readStoredDonorCoords(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng)
    ) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function persistDonorCoords(lat: number, lng: number) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lat, lng, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

/** Live GPS → profile → last saved browser coords. */
export function useDonorLiveCoords(profile?: {
  lat?: number;
  lng?: number;
} | null) {
  const { coords: liveCoords, status, retry } = useLiveLocation();
  const [storedCoords] = useState(readStoredDonorCoords);

  useEffect(() => {
    if (!liveCoords) return;
    persistDonorCoords(liveCoords.lat, liveCoords.lng);
  }, [liveCoords?.lat, liveCoords?.lng]);

  const profileCoords =
    typeof profile?.lat === "number" &&
    typeof profile?.lng === "number" &&
    Number.isFinite(profile.lat) &&
    Number.isFinite(profile.lng)
      ? { lat: profile.lat, lng: profile.lng }
      : null;

  return {
    coords: liveCoords ?? profileCoords ?? storedCoords,
    live: Boolean(liveCoords),
    status,
    retry,
  };
}
