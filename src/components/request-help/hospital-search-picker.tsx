"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Hospital as HospitalIcon, Loader2, MapPin, Navigation } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { DEMO_HOSPITALS } from "@/data/demo";
import { distanceKm, formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/types";

export type PickedHospital = Hospital & { distanceKm?: number };

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function wordsMatch(haystack: string, query: string) {
  const hay = normalize(haystack);
  const parts = normalize(query).split(" ").filter(Boolean);
  if (!parts.length) return false;
  return parts.every((part) => hay.includes(part));
}

function localSuggestions(query: string): Hospital[] {
  if (query.trim().length < 1) return [];
  return DEMO_HOSPITALS.filter((hospital) =>
    wordsMatch(`${hospital.name} ${hospital.area} ${hospital.city}`, query),
  ).slice(0, 8);
}

function withDistance(
  hospital: Hospital,
  coords?: { lat: number; lng: number } | null,
): PickedHospital {
  if (!coords) return hospital;
  return {
    ...hospital,
    distanceKm: distanceKm(coords.lat, coords.lng, hospital.lat, hospital.lng),
  };
}

function osmEmbedUrl(lat: number, lng: number) {
  const pad = 0.018;
  const left = lng - pad;
  const right = lng + pad;
  const top = lat + pad;
  const bottom = lat - pad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function HospitalSearchPicker({
  value,
  onChange,
  userCoords,
}: {
  value: PickedHospital | null;
  onChange: (hospital: PickedHospital | null) => void;
  userCoords?: { lat: number; lng: number } | null;
}) {
  const { t } = useLanguage();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PickedHospital[]>([]);
  const mapHospital = value;

  useEffect(() => {
    if (value?.name && value.name !== query) {
      setQuery(value.name);
    }
    // Only sync when an external selection changes the hospital id/name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.id, value?.name]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const instant = localSuggestions(q).map((item) => withDistance(item, userCoords));
    setSuggestions(instant);
    setOpen(true);

    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hospitals/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { hospitals?: Hospital[] };
        const remote = (data.hospitals ?? []).map((item) =>
          withDistance(item, userCoords),
        );
        const seen = new Set(instant.map((item) => normalize(item.name)));
        const merged = [...instant];
        for (const item of remote) {
          const key = normalize(item.name);
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(item);
        }
        setSuggestions(merged.slice(0, 10));
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, userCoords?.lat, userCoords?.lng]);

  function pick(hospital: Hospital) {
    const next = withDistance(hospital, userCoords);
    onChange(next);
    setQuery(next.name);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="space-y-3">
      <label className="block">
        <span className="text-sm font-bold text-ink">
          {t("request.hospitalName")} <span className="text-crimson">*</span>
        </span>
        <div className="relative mt-2">
          <input
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setOpen(true);
              if (value && next.trim() !== value.name) onChange(null);
            }}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && suggestions[0]) {
                e.preventDefault();
                pick(suggestions[0]);
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={t("request.hospitalPlaceholder")}
            className="w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 pr-11 text-ink shadow-sm outline-none transition focus:border-teal/40 focus:ring-2 focus:ring-teal/25"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <HospitalIcon className="size-4" aria-hidden />
            )}
          </span>

          {open && suggestions.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-teal/20 bg-white p-1.5 shadow-[0_18px_40px_-20px_rgba(13,115,112,0.55)]"
            >
              {suggestions.map((hospital) => (
                <li key={hospital.id} role="option">
                  <button
                    type="button"
                    onClick={() => pick(hospital)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-teal-soft/70"
                  >
                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal-deep">
                      <HospitalIcon className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {hospital.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin className="size-3 shrink-0" aria-hidden />
                        {[hospital.area, hospital.city].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    {typeof hospital.distanceKm === "number" ? (
                      <span className="shrink-0 rounded-full bg-teal-soft px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-teal-deep">
                        {formatDistance(hospital.distanceKm)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">{t("request.hospitalHint")}</p>
      </label>

      <div className="overflow-hidden rounded-2xl border border-teal/20 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-teal/10 px-3 py-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-teal-deep">
            <Navigation className="size-3.5" aria-hidden />
            {t("request.hospitalMap")}
          </p>
          {mapHospital ? (
            <p className="truncate text-xs font-semibold text-ink-muted">
              {mapHospital.name}
              {typeof mapHospital.distanceKm === "number"
                ? ` · ${formatDistance(mapHospital.distanceKm)}`
                : ""}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">{t("request.hospitalMapEmpty")}</p>
          )}
        </div>
        <div className="relative aspect-[16/9] w-full bg-[#e8f4f2]">
          {mapHospital ? (
            <iframe
              key={`${mapHospital.lat},${mapHospital.lng}`}
              title={t("request.hospitalMap")}
              src={osmEmbedUrl(mapHospital.lat, mapHospital.lng)}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : userCoords ? (
            <iframe
              key={`user-${userCoords.lat},${userCoords.lng}`}
              title={t("request.hospitalMap")}
              src={osmEmbedUrl(userCoords.lat, userCoords.lng)}
              className="absolute inset-0 h-full w-full border-0 opacity-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-ink-muted">
              {t("request.hospitalMapEmpty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
