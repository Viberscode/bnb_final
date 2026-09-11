"use client";

import { useEffect, useRef } from "react";
import type { Hospital } from "@/types";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type MapHospital = Hospital & { distanceKm?: number };

const DEFAULT_CENTER = { lat: 28.7165, lng: 77.1178 };

function hospitalIconHtml(selected: boolean) {
  const bg = selected ? "#0d7370" : "#c4122f";
  const ring = selected
    ? "0 0 0 3px rgba(13,115,112,0.35)"
    : "0 8px 18px -6px rgba(196,18,47,0.85)";
  return `<span style="
    display:inline-flex;align-items:center;justify-content:center;
    width:34px;height:34px;border-radius:9999px;border:2px solid #fff;
    background:${bg};box-shadow:${ring};cursor:pointer;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  </span>`;
}

export function HospitalLiveMap({
  center,
  hospitals,
  selectedId,
  onSelect,
  className,
}: {
  center: { lat: number; lng: number };
  hospitals: MapHospital[];
  selectedId?: string | null;
  onSelect: (hospital: MapHospital) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

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
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const marker = L.marker([hospital.lat, hospital.lng], {
          icon,
          title: hospital.name,
          riseOnHover: true,
        });
        marker.bindTooltip(hospital.name, {
          direction: "top",
          offset: [0, -16],
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

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-0 h-full w-full",
        "[&_.bloodkit-hospital-marker]:border-0 [&_.bloodkit-hospital-marker]:bg-transparent",
        className,
      )}
      role="presentation"
    />
  );
}

export const HOSPITAL_MAP_DEFAULT_CENTER = DEFAULT_CENTER;
