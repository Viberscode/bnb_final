"use client";

import { useEffect, useRef } from "react";
import type { Hospital } from "@/types";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type MapHospital = Hospital & { distanceKm?: number };

const DEFAULT_CENTER = { lat: 28.7165, lng: 77.1178 };
const MARKER_SIZE = 26;

function hospitalIconHtml(selected: boolean) {
  const ring = selected
    ? "0 0 0 3px rgba(255,255,255,0.95), 0 0 0 6px rgba(196,18,47,0.45)"
    : "0 0 0 3px rgba(255,255,255,0.95), 0 0 0 6px rgba(196,18,47,0.28)";
  return `<span style="
    display:inline-flex;align-items:center;justify-content:center;
    width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;border-radius:9999px;
    background:#c4122f;box-shadow:${ring};cursor:pointer;
  ">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  </span>`;
}

function userIconHtml() {
  return `<span style="
    position:relative;display:inline-flex;align-items:center;justify-content:center;
    width:22px;height:22px;
  ">
    <span style="
      position:absolute;inset:-10px;border-radius:9999px;
      background:rgba(15,159,122,0.28);
      animation:bloodkit-user-pulse 1.8s ease-out infinite;
    "></span>
    <span style="
      position:relative;width:18px;height:18px;border-radius:9999px;
      background:#0f9f7a;border:3px solid #fff;
      box-shadow:0 0 0 3px rgba(15,159,122,0.35), 0 8px 16px -6px rgba(15,159,122,0.7);
    "></span>
  </span>`;
}

export function HospitalLiveMap({
  center,
  hospitals,
  selectedId,
  userLocation,
  onSelect,
  className,
}: {
  center: { lat: number; lng: number };
  hospitals: MapHospital[];
  selectedId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onSelect: (hospital: MapHospital) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      if (!document.getElementById("bloodkit-user-pulse-style")) {
        const style = document.createElement("style");
        style.id = "bloodkit-user-pulse-style";
        style.textContent = `
          @keyframes bloodkit-user-pulse {
            0% { transform: scale(0.55); opacity: 0.7; }
            70% { transform: scale(1.35); opacity: 0; }
            100% { transform: scale(1.35); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      }).setView([center.lat, center.lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 80);
    }

    void boot();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
        userMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], map.getZoom() || 14, { animate: true });
  }, [center.lat, center.lng]);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function renderMarkers() {
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) {
        if (tries < 20) {
          tries += 1;
          window.setTimeout(() => {
            if (!cancelled) void renderMarkers();
          }, 100);
        }
        return;
      }

      const L = (await import("leaflet")).default;
      if (cancelled) return;

      group.clearLayers();

      for (const hospital of hospitals) {
        const selected = hospital.id === selectedId;
        const icon = L.divIcon({
          className: "bloodkit-hospital-marker",
          html: hospitalIconHtml(selected),
          iconSize: [MARKER_SIZE, MARKER_SIZE],
          iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
        });
        const marker = L.marker([hospital.lat, hospital.lng], {
          icon,
          title: hospital.name,
          riseOnHover: true,
          zIndexOffset: selected ? 200 : 0,
        });
        marker.bindTooltip(hospital.name, {
          direction: "top",
          offset: [0, -14],
          opacity: 0.95,
        });
        marker.on("click", () => {
          onSelectRef.current(hospital);
        });
        group.addLayer(marker);
      }

      window.setTimeout(() => map.invalidateSize(), 40);
    }

    void renderMarkers();
    return () => {
      cancelled = true;
    };
  }, [hospitals, selectedId]);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function renderUser() {
      const map = mapRef.current;
      if (!map) {
        if (tries < 20) {
          tries += 1;
          window.setTimeout(() => {
            if (!cancelled) void renderUser();
          }, 100);
        }
        return;
      }

      const L = (await import("leaflet")).default;
      if (cancelled) return;

      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }

      if (!userLocation) return;

      const icon = L.divIcon({
        className: "bloodkit-user-marker",
        html: userIconHtml(),
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon,
        title: "You",
        interactive: false,
        zIndexOffset: 500,
      });
      marker.addTo(map);
      userMarkerRef.current = marker;
    }

    void renderUser();
    return () => {
      cancelled = true;
    };
  }, [userLocation?.lat, userLocation?.lng]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-0 h-full w-full",
        "[&_.bloodkit-hospital-marker]:border-0 [&_.bloodkit-hospital-marker]:bg-transparent",
        "[&_.bloodkit-user-marker]:border-0 [&_.bloodkit-user-marker]:bg-transparent",
        className,
      )}
      role="presentation"
    />
  );
}

export const HOSPITAL_MAP_DEFAULT_CENTER = DEFAULT_CENTER;
