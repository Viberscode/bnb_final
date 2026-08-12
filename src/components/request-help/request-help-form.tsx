"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock3,
  Droplets,
  Hospital as HospitalIcon,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  UserRound,
} from "lucide-react";
import { DEMO_HOSPITALS, URGENCY_OPTIONS } from "@/data/demo";
import { useLiveLocation } from "@/hooks/use-live-location";
import { BLOOD_GROUPS } from "@/lib/blood-compatibility";
import {
  formatDistance,
  getNearbyPlaces,
  NEARBY_HOSPITAL_RADIUS_KM,
} from "@/lib/geo";
import { addLiveRequest } from "@/lib/live-requests";
import { cn } from "@/lib/utils";
import type { BloodGroup, UrgencyLevel } from "@/types";

type NearbyHospital = (typeof DEMO_HOSPITALS)[number] & { distanceKm: number };
type PanelTone = "crimson" | "amber" | "teal" | "slate";

function StepPanel({
  tone,
  step,
  title,
  icon: Icon,
  delayMs,
  children,
}: {
  tone: PanelTone;
  step: string;
  title: string;
  icon: typeof Droplets;
  delayMs: number;
  children: ReactNode;
}) {
  return (
    <section
      className="request-step-panel p-4 sm:p-5"
      data-tone={tone}
      style={{ animationDelay: `${delayMs}ms, ${delayMs}ms` }}
    >
      <header className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_10px_22px_-10px_rgba(0,0,0,0.45)] sm:size-11",
            tone === "crimson" &&
              "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
            tone === "amber" &&
              "bg-gradient-to-br from-amber-400 to-orange-600",
            tone === "teal" && "bg-gradient-to-br from-teal to-teal-deep",
            tone === "slate" &&
              "bg-gradient-to-br from-slate-500 to-slate-800",
          )}
        >
          <Icon className="size-4 sm:size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[0.65rem] font-bold uppercase tracking-[0.18em]",
              tone === "crimson" && "text-crimson",
              tone === "amber" && "text-amber-700",
              tone === "teal" && "text-teal-deep",
              tone === "slate" && "text-slate-600",
            )}
          >
            Step {step}
          </p>
          <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
            {title}
          </h2>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RequestHelpForm() {
  const router = useRouter();
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState("");
  const { coords, status: locStatus, retry: retryLocation } = useLiveLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nearby = useMemo<NearbyHospital[]>(() => {
    if (!coords) return [];
    return getNearbyPlaces(DEMO_HOSPITALS, coords.lat, coords.lng);
  }, [coords]);

  const selectedHospital = nearby.find((h) => h.id === hospitalId) ?? null;

  useEffect(() => {
    if (hospitalId && !nearby.some((h) => h.id === hospitalId)) {
      setHospitalId(null);
    }
  }, [nearby, hospitalId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!bloodGroup) {
      setError("Select the blood group required.");
      return;
    }
    if (!urgency) {
      setError("Choose how urgent this request is.");
      return;
    }
    if (!selectedHospital) {
      if (!coords) {
        setError("Enable live location to see hospitals near you.");
      } else if (nearby.length === 0) {
        setError(
          `No partner hospitals within ${NEARBY_HOSPITAL_RADIUS_KM} km. Try a different area or widen search later.`,
        );
      } else {
        setError("Pick a nearby hospital for pickup / delivery.");
      }
      return;
    }
    if (!contactName.trim()) {
      setError("Add a contact name so donors know who to reach.");
      return;
    }

    setSubmitting(true);
    try {
      const request = await addLiveRequest({
        bloodGroup,
        urgency,
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.name,
        hospitalArea: `${selectedHospital.area}, ${selectedHospital.city}`,
        contactName: contactName.trim(),
        phone: phone.trim(),
        units,
        notes: notes.trim() || undefined,
        distanceKm: selectedHospital.distanceKm,
      });
      router.push(`/requests?highlight=${request.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not publish request. Sign in with Google and check Supabase.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <StepPanel
        tone="crimson"
        step="01"
        title="Blood group"
        icon={Droplets}
        delayMs={40}
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
          {BLOOD_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setBloodGroup(group)}
              className={cn(
                "rounded-xl border px-2 py-3 font-display text-base font-extrabold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson hover:-translate-y-0.5",
                bloodGroup === group
                  ? "border-transparent bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] text-white shadow-[0_12px_24px_-10px_rgba(196,18,47,0.85)]"
                  : "border-rose-100 bg-white/90 text-ink shadow-sm hover:border-crimson/35 hover:shadow-md",
              )}
            >
              {group}
            </button>
          ))}
        </div>
      </StepPanel>

      <StepPanel
        tone="amber"
        step="02"
        title="Urgency"
        icon={AlertTriangle}
        delayMs={140}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {URGENCY_OPTIONS.map((option) => {
            const selected = urgency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setUrgency(option.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 hover:-translate-y-1",
                  selected
                    ? option.value === "critical"
                      ? "border-[#ff2d4a] bg-[#fff1f3] shadow-[0_18px_34px_-16px_rgba(255,45,74,0.55)]"
                      : option.value === "urgent"
                        ? "border-amber-400 bg-amber-50 shadow-[0_18px_34px_-16px_rgba(245,158,11,0.5)]"
                        : "border-teal bg-teal-soft/80 shadow-[0_18px_34px_-16px_rgba(13,115,112,0.45)]"
                    : "border-white/80 bg-white/90 shadow-sm hover:shadow-md",
                )}
              >
                <span className="flex items-center gap-2">
                  {option.value === "critical" ? (
                    <AlertTriangle className="size-4 text-[#ff2d4a]" />
                  ) : (
                    <Clock3
                      className={cn(
                        "size-4",
                        option.value === "urgent"
                          ? "text-amber-600"
                          : "text-teal",
                      )}
                    />
                  )}
                  <span className="font-display text-xl font-extrabold tracking-tight text-ink">
                    {option.label}
                  </span>
                </span>
                <span className="mt-2 block text-sm font-bold text-ink">
                  {option.window}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {option.detail}
                </span>
              </button>
            );
          })}
        </div>
      </StepPanel>

      <StepPanel
        tone="teal"
        step="03"
        title="Hospital near you"
        icon={HospitalIcon}
        delayMs={240}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-ink-muted">
            <Navigation className="size-4 text-teal" aria-hidden />
            {locStatus === "loading" && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> Getting live
                location…
              </span>
            )}
            {locStatus === "tracking" && coords && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal-deep">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
                Within {NEARBY_HOSPITAL_RADIUS_KM} km · ±
                {Math.round(coords.accuracy)} m
              </span>
            )}
            {locStatus === "denied" && (
              <span>Location blocked — enable it to see nearby hospitals.</span>
            )}
            {locStatus === "unavailable" && (
              <span>Location unavailable on this device.</span>
            )}
          </div>
          {(locStatus === "denied" || locStatus === "unavailable") && (
            <button
              type="button"
              onClick={retryLocation}
              className="rounded-lg bg-teal-soft px-2.5 py-1 text-xs font-bold text-teal-deep hover:bg-teal/20"
            >
              Try again
            </button>
          )}
        </div>

        <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-2xl bg-white/70 p-2 ring-1 ring-teal/15">
          {locStatus === "loading" ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              Finding hospitals near your live location…
            </p>
          ) : !coords ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              Allow location access to recommend hospitals near you in real
              time.
            </p>
          ) : nearby.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              No partner hospitals within {NEARBY_HOSPITAL_RADIUS_KM} km of your
              current location.
            </p>
          ) : (
            nearby.map((hospital) => {
              const selected = hospitalId === hospital.id;
              return (
                <button
                  key={hospital.id}
                  type="button"
                  onClick={() => setHospitalId(hospital.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                    selected
                      ? "border-teal bg-teal-soft/70 shadow-sm"
                      : "border-transparent bg-white/60 hover:border-teal/25 hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition",
                      selected
                        ? "bg-gradient-to-br from-teal to-teal-deep text-white shadow-[0_12px_22px_-10px_rgba(13,115,112,0.75)]"
                        : "bg-ink/5 text-ink-muted",
                    )}
                  >
                    <HospitalIcon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {hospital.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      {hospital.area}, {hospital.city}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-teal-soft px-2.5 py-1 text-xs font-bold tabular-nums text-teal-deep">
                    {formatDistance(hospital.distanceKm)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </StepPanel>

      <StepPanel
        tone="slate"
        step="04"
        title="Contact details"
        icon={UserRound}
        delayMs={340}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink">Your name</span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
              placeholder="Who should donors contact?"
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              Phone{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
              placeholder="+91 …"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
          <label className="block">
            <span className="text-sm font-bold text-ink">Units</span>
            <input
              type="number"
              min={1}
              max={10}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value) || 1)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              Notes{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
              placeholder="Ward / patient code / anything donors should know"
            />
          </label>
        </div>
      </StepPanel>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm font-semibold text-crimson-deep"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="shiny-card group relative inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#c91833] via-[#e11d48] to-[#8a1024] text-lg font-extrabold text-white shadow-[0_20px_44px_-14px_rgba(201,24,51,0.9)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-70 sm:w-auto sm:min-w-80 sm:px-12"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
          aria-hidden
        />
        {submitting ? (
          <>
            <Loader2 className="relative size-5 animate-spin" /> Going live…
          </>
        ) : (
          <>
            <Sparkles className="relative size-5 opacity-95" aria-hidden />
            <span className="relative">Submit & go live</span>
          </>
        )}
      </button>
    </form>
  );
}
