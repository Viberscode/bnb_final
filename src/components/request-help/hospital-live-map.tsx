"use client";

import { useEffect, useRef } from "react";
import type { Hospital } from "@/types";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type MapHospital = Hospital & { distanceKm?: number };

const DEFAULT_CENTER = { lat: 28.7165, lng: 77.1178 };

function formatKm(km?: number) {
  if (typeof km !== "number" || !Number.isFinite(km)) return "";
  if (km < 1) return ` · ${Math.round(km * 1000)} m`;
  return ` · ${km.toFixed(1)} km`;
}

function redPinHtml(nearest: boolean, selected: boolean) {
  const w = nearest || selected ? 32 : 26;
  const h = nearest || selected ? 42 : 34;
  const fill = selected ? "#8e0c22" : "#c4122f";
  const ring = nearest
    ? "drop-shadow(0 0 0 3px #fff) drop-shadow(0 0 0 6px rgba(196,18,47,0.55))"
    : "drop-shadow(0 2px 4px rgba(0,0,0,0.35))";
  const badge = nearest
    ? `<span style="position:absolute;left:50%;top:-2px;transform:translate(-50%,-100%);
        background:#c4122f;color:#fff;font:800 8px/1 system-ui,sans-serif;
        letter-spacing:.1em;padding:3px 5px;border-radius:999px;">NEAR</span>`
    : "";
  return `<span style="position:relative;display:block;width:${w}px;height:${h}px;filter:${ring};">
    ${badge}
    <svg width="${w}" height="${h}" viewBox="0 0 24 36" aria-hidden="true">
      <path fill="${fill}" d="M12 0C5.4 0 0 5.2 0 11.6 0 20.4 12 36 12 36s12-15.6 12-24.4C24 5.2 18.6 0 12 0z"/>
      <circle cx="12" cy="12" r="5.2" fill="#fff"/>
      <path fill="${fill}" d="M12 8.2v7.6M8.2 12h7.6" stroke="${fill}" stroke-width="1.8" stroke-linecap="round"/>
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
      box-shadow:0 0 0 3px rgba(15,159,122,0.35);
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
  const lineRef = useRef<import("leaflet").Polyline | null>(null);
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

      const start = userLocationRef.current ?? center;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      }).setView([start.lat, start.lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      resizeObserver = ro;

      const draw = () => {
        map.invalidateSize();
        void paintAll();
      };
      map.whenReady(draw);
      window.setTimeout(draw, 120);
      window.setTimeout(draw, 400);
    }

    async function paintAll() {
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) return;
      const L = (await import("leaflet")).default;
      const pins = hospitalsRef.current;
      const selected = selectedIdRef.current;
      const nearest = pins.find((item) => item.id === nearestIdRef.current) ?? null;
      const user = userLocationRef.current;

      group.clearLayers();
      for (const hospital of pins) {
        if (!Number.isFinite(hospital.lat) || !Number.isFinite(hospital.lng)) {
          continue;
        }
        const isSelected = hospital.id === selected;
        const isNearest = hospital.id === nearest?.id;
        const w = isNearest || isSelected ? 32 : 26;
        const h = isNearest || isSelected ? 42 : 34;
        const icon = L.divIcon({
          className: "bloodkit-hospital-pin",
          html: redPinHtml(isNearest, isSelected),
          iconSize: [w, h],
          iconAnchor: [w / 2, h],
        });
        const marker = L.marker([hospital.lat, hospital.lng], {
          icon,
          title: `${hospital.name}${formatKm(hospital.distanceKm)}`,
          riseOnHover: true,
          zIndexOffset: isSelected ? 600 : isNearest ? 500 : 250,
        });
        marker.bindTooltip(
          `${isNearest ? "Nearest · " : ""}${hospital.name}${formatKm(hospital.distanceKm)}`,
          { direction: "top", offset: [0, -36], opacity: 0.95 },
        );
        marker.on("click", () => onSelectRef.current(hospital));
        group.addLayer(marker);
      }

      if (userMarkerRef.current) {
        if (user) userMarkerRef.current.setLatLng([user.lat, user.lng]);
        else {
          map.removeLayer(userMarkerRef.current);
          userMarkerRef.current = null;
        }
      } else if (user) {
        const icon = L.divIcon({
          className: "bloodkit-user-marker",
          html: userIconHtml(),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        userMarkerRef.current = L.marker([user.lat, user.lng], {
          icon,
          title: "You",
          interactive: false,
          zIndexOffset: 900,
        }).addTo(map);
      }

      const linePoints =
        user && nearest
          ? ([
              [user.lat, user.lng],
              [nearest.lat, nearest.lng],
            ] as [number, number][])
          : null;

      if (linePoints) {
        if (lineRef.current) {
          lineRef.current.setLatLngs(linePoints);
        } else {
          lineRef.current = L.polyline(linePoints, {
            color: "#c4122f",
            weight: 3,
            opacity: 0.95,
            dashArray: "7 8",
            lineCap: "round",
            interactive: false,
          }).addTo(map);
        }
      } else if (lineRef.current) {
        map.removeLayer(lineRef.current);
        lineRef.current = null;
      }

      const key = `${pins.map((item) => item.id).sort().join("|")}:${nearest?.id ?? ""}`;
      if (fittedKeyRef.current !== key) {
        fittedKeyRef.current = key;
        const points: [number, number][] = pins
          .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
          .map((item) => [item.lat, item.lng]);
        if (user) points.push([user.lat, user.lng]);
        if (points.length >= 2) {
          map.fitBounds(points, { padding: [40, 40], maxZoom: 15, animate: false });
        } else if (points.length === 1) {
          map.setView(points[0], 14, { animate: false });
        }
      }
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
        lineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function tick() {
      const map = mapRef.current;
      if (!map || !markersRef.current) {
        if (tries < 40) {
          tries += 1;
          window.setTimeout(() => {
            if (!cancelled) void tick();
          }, 100);
        }
        return;
      }
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      const pins = hospitals;
      const from = userLocation;
      const nearest =
        pins.find((item) => item.id === nearestId) ??
        (from
          ? [...pins]
              .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
              .sort((a, b) => {
                const da =
                  a.distanceKm ??
                  Math.hypot(a.lat - from.lat, a.lng - from.lng);
                const db =
                  b.distanceKm ??
                  Math.hypot(b.lat - from.lat, b.lng - from.lng);
                return da - db;
              })[0] ?? null
          : null);
      const group = markersRef.current;
      group.clearLayers();
      for (const hospital of pins) {
        if (!Number.isFinite(hospital.lat) || !Number.isFinite(hospital.lng)) continue;
        const isSelected = hospital.id === selectedId;
        const isNearest = hospital.id === nearest?.id;
        const w = isNearest || isSelected ? 32 : 26;
        const h = isNearest || isSelected ? 42 : 34;
        const icon = L.divIcon({
          className: "bloodkit-hospital-pin",
          html: redPinHtml(isNearest, isSelected),
          iconSize: [w, h],
          iconAnchor: [w / 2, h],
        });
        const marker = L.marker([hospital.lat, hospital.lng], {
          icon,
          title: `${hospital.name}${formatKm(hospital.distanceKm)}`,
          riseOnHover: true,
          zIndexOffset: isSelected ? 600 : isNearest ? 500 : 250,
        });
        marker.bindTooltip(
          `${isNearest ? "Nearest · " : ""}${hospital.name}${formatKm(hospital.distanceKm)}`,
          { direction: "top", offset: [0, -36], opacity: 0.95 },
        );
        marker.on("click", () => onSelectRef.current(hospital));
        group.addLayer(marker);
      }

      if (userLocation) {
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
          const icon = L.divIcon({
            className: "bloodkit-user-marker",
            html: userIconHtml(),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
            icon,
            title: "You",
            interactive: false,
            zIndexOffset: 900,
          }).addTo(map);
        }
      }

      const linePoints =
        userLocation && nearest
          ? ([
              [userLocation.lat, userLocation.lng],
              [nearest.lat, nearest.lng],
            ] as [number, number][])
          : null;
      if (linePoints) {
        if (lineRef.current) lineRef.current.setLatLngs(linePoints);
        else {
          lineRef.current = L.polyline(linePoints, {
            color: "#c4122f",
            weight: 3,
            opacity: 0.95,
            dashArray: "7 8",
            lineCap: "round",
            interactive: false,
          }).addTo(map);
        }
      } else if (lineRef.current) {
        map.removeLayer(lineRef.current);
        lineRef.current = null;
      }
    }
    void tick();
    return () => {
      cancelled = true;
    };
  }, [hospitals, selectedId, nearestId, userLocation?.lat, userLocation?.lng]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative z-10 h-[320px] min-h-[280px] w-full overflow-hidden rounded-b-2xl",
        "[&_.leaflet-container]:!h-full [&_.leaflet-container]:!w-full",
        "[&_.bloodkit-hospital-pin]:!bg-transparent [&_.bloodkit-hospital-pin]:!border-0",
        "[&_.bloodkit-user-marker]:!bg-transparent [&_.bloodkit-user-marker]:!border-0",
        className,
      )}
      role="presentation"
    />
  );
}

export const HOSPITAL_MAP_DEFAULT_CENTER = DEFAULT_CENTER;
