"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

function pinHtml(fill: string) {
  return `<span style="display:block;width:28px;height:38px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
    <svg width="28" height="38" viewBox="0 0 24 36" aria-hidden="true">
      <path fill="${fill}" d="M12 0C5.4 0 0 5.2 0 11.6 0 20.4 12 36 12 36s12-15.6 12-24.4C24 5.2 18.6 0 12 0z"/>
      <circle cx="12" cy="12" r="5" fill="#fff"/>
    </svg>
  </span>`;
}

export function NgoLocationMap({
  lat,
  lng,
  name,
  className,
  accent = "#c4122f",
}: {
  lat: number;
  lng: number;
  name: string;
  className?: string;
  accent?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function boot() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: true,
      }).setView([lat, lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: pinHtml(accent),
        iconSize: [28, 38],
        iconAnchor: [14, 36],
      });
      L.marker([lat, lng], { icon, title: name }).addTo(map);
      mapRef.current = map;

      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      resizeObserver = ro;
      window.setTimeout(() => map.invalidateSize(), 160);
    }

    void boot();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [accent, lat, lng, name]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full min-h-[220px] w-full bg-[#e8eef3]", className)}
      role="img"
      aria-label={name}
    />
  );
}
