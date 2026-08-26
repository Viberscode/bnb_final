"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Droplets,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { MockKycPanel } from "@/components/donor/mock-kyc-panel";
import { BloodGroupText } from "@/components/request-help/blood-group-mark";
import { BLOOD_GROUPS } from "@/lib/blood-compatibility";
import { fetchDonorProfile, saveDonorProfile } from "@/lib/donor-profile";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { useLiveLocation } from "@/hooks/use-live-location";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";
import type { BloodGroup } from "@/types";

type PanelTone = "crimson" | "amber" | "teal" | "slate" | "indigo";

const DONATION_WAIT_DAYS = 90;

function indianMobileDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function donationWait(lastDonation: string) {
  if (!lastDonation) return null;
  const last = new Date(`${lastDonation}T00:00:00`);
  if (Number.isNaN(last.getTime())) return null;
  const eligible = new Date(last);
  eligible.setDate(eligible.getDate() + DONATION_WAIT_DAYS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (eligible <= today) return null;
  return {
    eligible,
    days: Math.ceil((eligible.getTime() - today.getTime()) / 86_400_000),
  };
}

function StepPanel({
  tone,
  step,
  stepLabel,
  title,
  icon: Icon,
  delayMs,
  children,
}: {
  tone: PanelTone;
  step: string;
  stepLabel: string;
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
            tone === "indigo" &&
              "bg-gradient-to-br from-indigo-500 to-violet-700",
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
              tone === "indigo" && "text-indigo-700",
            )}
          >
            {stepLabel} {step}
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

export function BecomeDonorForm() {
  const { t, locale } = useLanguage();
  const { user, status } = useAuth();
  const [fullName, setFullName] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [available, setAvailable] = useState(true);
  const [lastDonation, setLastDonation] = useState("");
  const [age, setAge] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const { coords, status: locStatus, retry: retryLocation } = useLiveLocation();

  useEffect(() => {
    if (user) {
      setFullName(
        (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          "",
      );
      setEmail(user.email ?? "");
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const existing = await fetchDonorProfile();
      if (!existing || !active) return;
      setIsEdit(true);
      setFullName(existing.fullName);
      setBloodGroup(existing.bloodGroup);
      setPhone(indianMobileDigits(existing.phone));
      setEmail(existing.email ?? "");
      setAvailable(existing.available);
      setLastDonation(existing.lastDonation ?? "");
      setAge(existing.age ? String(existing.age) : "");
      setNotes(existing.notes ?? "");
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!coords || manualLocation) return;
    let active = true;
    setResolvingPlace(true);
    const timer = window.setTimeout(() => {
      void reverseGeocode(coords.lat, coords.lng, locale).then((place) => {
        if (!active) return;
        setResolvingPlace(false);
        if (!place) return;
        setCity(place.city);
        setArea(place.area);
      });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [coords, manualLocation, locale]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (status !== "authenticated") {
      setError(t("donor.errSignIn"));
      return;
    }
    if (!fullName.trim()) {
      setError(t("donor.errName"));
      return;
    }
    const ageNum = age ? Number(age) : NaN;
    if (!age || ageNum < 18 || ageNum > 65) {
      setError(t("donor.errAge"));
      return;
    }
    const wait = donationWait(lastDonation);
    if (wait) {
      setError(t("donor.errWait"));
      return;
    }
    if (!bloodGroup) {
      setError(t("donor.errGroup"));
      return;
    }
    const mobile = indianMobileDigits(phone);
    if (mobile.length !== 10) {
      setPhoneTouched(true);
      setError(t("donor.errPhoneDigits"));
      return;
    }
    if (!coords) {
      setError(t("donor.errLocation"));
      return;
    }
    if (!city.trim() || !area.trim()) {
      setError(t("donor.errCity"));
      return;
    }
    if (!isEdit && !kycVerified) {
      setError(t("donor.errKyc"));
      return;
    }

    setSubmitting(true);
    try {
      await saveDonorProfile({
        fullName,
        bloodGroup,
        phone: `+91${mobile}`,
        email,
        city,
        area,
        available,
        lastDonation: lastDonation || undefined,
        age: age ? Number(age) : undefined,
        notes,
      });
      const rawNext = new URLSearchParams(window.location.search).get("next");
      const next =
        rawNext &&
        rawNext.startsWith("/") &&
        !rawNext.startsWith("//") &&
        !rawNext.startsWith("/\\")
          ? rawNext
          : null;
      window.location.assign(next ?? "/profile/donor");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("donor.errSave"),
      );
      setSubmitting(false);
    }
  }

  const wait = donationWait(lastDonation);
  const ageNum = age ? Number(age) : NaN;
  const ageBlocked = Boolean(age) && (ageNum < 18 || ageNum > 65);
  const restLocked = Boolean(wait) || ageBlocked;
  const eligibleLabel = wait
    ? wait.eligible.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <StepPanel
        tone="teal"
        step="01"
        stepLabel={t("donor.step")}
        title={t("donor.aboutYou")}
        icon={UserRound}
        delayMs={40}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink">
              {t("donor.fullName")} <span className="text-crimson">*</span>
            </span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
              placeholder={t("donor.namePlaceholder")}
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("donor.age")} <span className="text-crimson">*</span>
            </span>
            <input
              type="number"
              min={18}
              max={65}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
              placeholder="18–65"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("donor.lastDonation")}{" "}
              <span className="font-normal text-ink-muted">{t("donor.optional")}</span>
            </span>
            <input
              type="date"
              value={lastDonation}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setLastDonation(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
            />
          </label>
        </div>
        {wait ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3.5"
          >
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-amber-950">
              <AlertTriangle className="size-5 text-amber-600" aria-hidden />
              {t("donor.waitTitle")}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-amber-900">
              {t("donor.waitBody", { date: eligibleLabel })}
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-amber-800">
              {t("donor.waitDays", { n: wait.days })}
            </p>
          </div>
        ) : ageBlocked ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm font-semibold text-crimson-deep"
          >
            {t("donor.errAge")}
          </p>
        ) : null}
      </StepPanel>

      <fieldset disabled={restLocked} className={cn(restLocked && "pointer-events-none opacity-45")}>
      <StepPanel
        tone="crimson"
        step="02"
        stepLabel={t("donor.step")}
        title={t("donor.bloodGroup")}
        icon={Droplets}
        delayMs={140}
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
              <BloodGroupText group={group} />
            </button>
          ))}
        </div>
      </StepPanel>

      <StepPanel
        tone="amber"
        step="03"
        stepLabel={t("donor.step")}
        title={t("donor.contact")}
        icon={Phone}
        delayMs={240}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("donor.phone")} <span className="text-crimson">*</span>
            </span>
            <div
              className={cn(
                "mt-2 flex items-center rounded-2xl border bg-white/95 shadow-sm outline-none transition focus-within:ring-2",
                phoneTouched && phone.length !== 10
                  ? "border-crimson focus-within:border-crimson focus-within:ring-crimson/25"
                  : "border-amber-200 focus-within:border-amber-400 focus-within:ring-amber-300/40",
              )}
            >
              <span className="shrink-0 pl-4 font-display text-base font-extrabold text-ink">
                +91
              </span>
              <input
                value={phone}
                onChange={(e) => {
                  setPhoneTouched(true);
                  setPhone(indianMobileDigits(e.target.value));
                }}
                onBlur={() => setPhoneTouched(true)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-ink outline-none"
                placeholder="98765 43210"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>
            {phoneTouched && phone.length !== 10 ? (
              <p className="mt-1.5 text-xs font-bold text-crimson">{t("donor.invalid")}</p>
            ) : null}
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("donor.email")}{" "}
              <span className="font-normal text-ink-muted">{t("donor.optional")}</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
              placeholder="you@email.com"
              autoComplete="email"
            />
          </label>
        </div>
      </StepPanel>

      <StepPanel
        tone="slate"
        step="04"
        stepLabel={t("donor.step")}
        title={t("donor.locationAvail")}
        icon={MapPin}
        delayMs={340}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-ink-muted">
            <Navigation className="size-4 text-teal" aria-hidden />
            {locStatus === "loading" && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> {t("donor.gettingLocation")}
              </span>
            )}
            {locStatus === "tracking" && coords && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal-deep">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {t("request.live")}
                </span>
                <span className="font-semibold text-ink">
                  {t("donor.gpsAccuracy", { m: Math.round(coords.accuracy) })}
                </span>
                <span className="text-xs font-semibold tabular-nums text-ink-muted">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              </span>
            )}
            {locStatus === "denied" && <span>{t("request.locationBlocked")}</span>}
            {locStatus === "unavailable" && (
              <span>{t("request.locationUnavailable")}</span>
            )}
          </div>
          {(locStatus === "denied" || locStatus === "unavailable") && (
            <button
              type="button"
              onClick={retryLocation}
              className="rounded-lg bg-teal-soft px-2.5 py-1 text-xs font-bold text-teal-deep hover:bg-teal/20"
            >
              {t("request.tryAgain")}
            </button>
          )}
        </div>
        {locStatus === "tracking" && coords ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-teal-deep">
              {resolvingPlace && !city ? t("donor.readingAddress") : t("donor.liveArea")}
            </p>
            {manualLocation ? (
              <button
                type="button"
                onClick={() => setManualLocation(false)}
                className="rounded-lg bg-teal-soft px-2.5 py-1 text-xs font-bold text-teal-deep hover:bg-teal/20"
              >
                {t("donor.followLive")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("donor.city")} <span className="text-crimson">*</span>
            </span>
            <input
              value={city}
              onChange={(e) => {
                setManualLocation(true);
                setCity(e.target.value);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40"
              placeholder="New Delhi"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("donor.area")} <span className="text-crimson">*</span>
            </span>
            <input
              value={area}
              onChange={(e) => {
                setManualLocation(true);
                setArea(e.target.value);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40"
              placeholder="Saket / Dwarka / …"
              required
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setAvailable((v) => !v)}
          className={cn(
            "mt-5 flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition",
            available
              ? "border-teal bg-teal-soft/70"
              : "border-slate-200 bg-white",
          )}
        >
          <span>
            <span className="block font-display text-lg font-extrabold text-ink">
              {available ? t("donor.available") : t("donor.notAvailable")}
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              {t("donor.availableHint")}
            </span>
          </span>
          <span
            className={cn(
              "relative h-8 w-14 rounded-full transition",
              available ? "bg-teal" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-6 rounded-full bg-white shadow transition",
                available ? "left-7" : "left-1",
              )}
            />
          </span>
        </button>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-ink">
            {t("donor.notes")} <span className="font-normal text-ink-muted">{t("donor.optional")}</span>
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40"
            placeholder={t("donor.notesPlaceholder")}
          />
        </label>
      </StepPanel>

      <StepPanel
        tone="indigo"
        step="05"
        stepLabel={t("donor.step")}
        title={t("donor.kyc")}
        icon={ShieldCheck}
        delayMs={440}
      >
        <MockKycPanel skip={isEdit} onVerifiedChange={setKycVerified} />
      </StepPanel>
      </fieldset>

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
        disabled={submitting || restLocked || (!isEdit && !kycVerified)}
        className="shiny-card group relative inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f9f7a] to-[#0a6b54] text-lg font-extrabold text-white shadow-[0_20px_44px_-14px_rgba(15,159,122,0.85)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-70 sm:w-auto sm:min-w-80 sm:px-12"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
          aria-hidden
        />
        {submitting ? (
          <>
            <Loader2 className="relative size-5 animate-spin" /> {t("donor.saving")}
          </>
        ) : (
          <>
            <Sparkles className="relative size-5 opacity-95" aria-hidden />
            <span className="relative">
              {isEdit ? t("donor.save") : t("donor.join")}
            </span>
          </>
        )}
      </button>
    </form>
  );
}
