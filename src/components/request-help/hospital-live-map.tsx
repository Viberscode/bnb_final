"use client";

import { useEffect, useRef } from "react";
import type { Hospital } from "@/types";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type MapHospital = Hospital & { distanceKm?: number };

const DEFAULT_CENTER = { lat: 28.7165, lng: 77.1178 };
const MARKER_SIZE = 28;
const NEAREST_SIZE = 34;

function hospitalSignHtml(opts: {
  selected: boolean;
  nearest: boolean;
  label?: string;
}) {
  const size = opts.nearest ? NEAREST_SIZE : MARKER_SIZE;
  const bg = opts.selected ? "#8e0c22" : opts.nearest ? "#0d7370" : "#c4122f";
  const ring = opts.selected
    ? "0 0 0 3px #fff, 0 0 0 6px rgba(196,18,47,0.55)"
    : opts.nearest
      ? "0 0 0 3px #fff, 0 0 0 6px rgba(13,115,112,0.5)"
      : "0 0 0 2px #fff, 0 0 0 5px rgba(196,18,47,0.28)";
  const badge = opts.nearest
    ? `<span style="position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);
        background:#0d7370;color:#fff;font:700 8px/1.2 system-ui,sans-serif;
        letter-spacing:.08em;padding:2px 5px;border-radius:999px;white-space:nowrap;">NEAR</span>`
    : "";
  return `<span style="
    position:relative;display:inline-flex;align-items:center;justify-content:center;
    width:${size}px;height:${size}px;
  ">
    <span style="
      display:inline-flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:7px;
      background:${bg};box-shadow:${ring};cursor:pointer;
      color:#fff;font:900 15px/1 ui-sans-serif,system-ui,sans-serif;
    ">H</span>
    ${badge}
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
  nearestId,
  userLocation,
  onSelect,
  className,
}: {
  center: { lat: number; lng: number };
  hospitals: MapHospital[];
  selectedId?: string | null;
  nearestId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onSelect: (hospital: MapHospital) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const hospitalsRef = useRef(hospitals);
  const selectedIdRef = useRef(selectedId);
  const nearestIdRef = useRef(nearestId);
  const userLocationRef = useRef(userLocation);
  const fittedKeyRef = useRef("");
  onSelectRef.current = onSelect;
  hospitalsRef.current = hospitals;
  selectedIdRef.current = selectedId;
  nearestIdRef.current = nearestId;
  userLocationRef.current = userLocation;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

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
      }).setView([center.lat, center.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(containerRef.current);
      resizeObserver = ro;

      map.whenReady(() => {
        map.invalidateSize();
        void drawMarkers();
        void drawUser();
      });
      window.setTimeout(() => {
        map.invalidateSize();
        void drawMarkers();
        void drawUser();
      }, 200);
    }

    async function drawMarkers() {
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) return;
      const L = (await import("leaflet")).default;
      const pins = hospitalsRef.current;
      const selected = selectedIdRef.current;
      const nearest = nearestIdRef.current;
      group.clearLayers();

      for (const hospital of pins) {
        if (!Number.isFinite(hospital.lat) || !Number.isFinite(hospital.lng)) {
          continue;
        }
        const isSelected = hospital.id === selected;
        const isNearest = hospital.id === nearest;
        const size = isNearest ? NEAREST_SIZE : MARKER_SIZE;
        const icon = L.divIcon({
          className: "bloodkit-hospital-marker",
          html: hospitalSignHtml({ selected: isSelected, nearest: isNearest }),
          iconSize: [size, isNearest ? size + 14 : size],
          iconAnchor: [size / 2, size / 2],
        });
        const km =
          typeof hospital.distanceKm === "number"
            ? ` · ${hospital.distanceKm < 1 ? `${Math.round(hospital.distanceKm * 1000)} m` : `${hospital.distanceKm.toFixed(1)} km`}`
            : "";
        const marker = L.marker([hospital.lat, hospital.lng], {
          icon,
          title: `${hospital.name}${km}`,
          riseOnHover: true,
          keyboard: true,
          zIndexOffset: isSelected ? 500 : isNearest ? 450 : 200,
        });
        marker.bindTooltip(
          `${isNearest ? "Nearest · " : ""}${hospital.name}${km}`,
          {
            direction: "top",
            offset: [0, -16],
            opacity: 0.95,
          },
        );
        marker.on("click", () => {
          onSelectRef.current(hospital);
        });
        group.addLayer(marker);
      }

      const key = pins
        .map((item) => item.id)
        .sort()
        .join("|");
      const points: [number, number][] = pins
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .map((item) => [item.lat, item.lng]);
      const user = userLocationRef.current;
      if (user && Number.isFinite(user.lat) && Number.isFinite(user.lng)) {
        points.push([user.lat, user.lng]);
      }
      if (points.length >= 1 && fittedKeyRef.current !== key) {
        fittedKeyRef.current = key;
        if (points.length >= 2) {
          map.fitBounds(points, { padding: [36, 36], maxZoom: 15, animate: false });
        } else {
          map.setView(points[0], 14, { animate: false });
        }
      }
    }

    async function drawUser() {
      const map = mapRef.current;
      if (!map) return;
      const L = (await import("leaflet")).default;
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      const user = userLocationRef.current;
      if (!user) return;
      const icon = L.divIcon({
        className: "bloodkit-user-marker",
        html: userIconHtml(),
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker([user.lat, user.lng], {
        icon,
        title: "You",
        interactive: false,
        zIndexOffset: 800,
      });
      marker.addTo(map);
      userMarkerRef.current = marker;
    }

    void boot();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
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
    if (!map || hospitals.length) return;
    map.setView([center.lat, center.lng], map.getZoom() || 14, { animate: true });
  }, [center.lat, center.lng, hospitals.length]);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function paint() {
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) {
        if (tries < 40) {
          tries += 1;
          window.setTimeout(() => {
            if (!cancelled) void paint();
          }, 120);
        }
        return;
      }
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      group.clearLayers();
      for (const hospital of hospitals) {
        if (!Number.isFinite(hospital.lat) || !Number.isFinite(hospital.lng)) {
          continue;
        }
        const isSelected = hospital.id === selectedId;
        const isNearest = hospital.id === nearestId;
        const size = isNearest ? NEAREST_SIZE : MARKER_SIZE;
        const icon = L.divIcon({
          className: "bloodkit-hospital-marker",
          html: hospitalSignHtml({ selected: isSelected, nearest: isNearest }),
          iconSize: [size, isNearest ? size + 14 : size],
          iconAnchor: [size / 2, size / 2],
        });
        const km =
          typeof hospital.distanceKm === "number"
            ? ` · ${hospital.distanceKm < 1 ? `${Math.round(hospital.distanceKm * 1000)} m` : `${hospital.distanceKm.toFixed(1)} km`}`
            : "";
        const marker = L.marker([hospital.lat, hospital.lng], {
          icon,
          title: `${hospital.name}${km}`,
          riseOnHover: true,
          zIndexOffset: isSelected ? 500 : isNearest ? 450 : 200,
        });
        marker.bindTooltip(
          `${isNearest ? "Nearest · " : ""}${hospital.name}${km}`,
          {
            direction: "top",
            offset: [0, -16],
            opacity: 0.95,
          },
        );
        marker.on("click", () => onSelectRef.current(hospital));
        group.addLayer(marker);
      }

      const key = hospitals
        .map((item) => item.id)
        .sort()
        .join("|");
      const points: [number, number][] = hospitals
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .map((item) => [item.lat, item.lng]);
      if (userLocation) points.push([userLocation.lat, userLocation.lng]);
      if (points.length >= 1 && fittedKeyRef.current !== key) {
        fittedKeyRef.current = key;
        if (points.length >= 2) {
          map.fitBounds(points, { padding: [36, 36], maxZoom: 15, animate: false });
        } else {
          map.setView(points[0], 14, { animate: false });
        }
      }
      window.setTimeout(() => map.invalidateSize(), 40);
    }
    void paint();
    return () => {
      cancelled = true;
    };
  }, [hospitals, selectedId, nearestId, userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function paintUser() {
      const map = mapRef.current;
      if (!map) {
        if (tries < 40) {
          tries += 1;
          window.setTimeout(() => {
            if (!cancelled) void paintUser();
          }, 120);
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
        zIndexOffset: 800,
      });
      marker.addTo(map);
      userMarkerRef.current = marker;
    }
    void paintUser();
    return () => {
      cancelled = true;
    };
  }, [userLocation?.lat, userLocation?.lng]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative z-10 h-[320px] min-h-[280px] w-full overflow-hidden rounded-b-2xl",
        "[&_.leaflet-container]:!h-full [&_.leaflet-container]:!w-full",
        className,
      )}
      role="presentation"
    />
  );
}

export const HOSPITAL_MAP_DEFAULT_CENTER = DEFAULT_CENTER;
