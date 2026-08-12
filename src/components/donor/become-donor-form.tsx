"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Loader2,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BLOOD_GROUPS } from "@/lib/blood-compatibility";
import { fetchDonorProfile, saveDonorProfile } from "@/lib/donor-profile";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { BloodGroup } from "@/types";

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

export function BecomeDonorForm() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [fullName, setFullName] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [phone, setPhone] = useState("");
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
      setPhone(existing.phone);
      setEmail(existing.email ?? "");
      setCity(existing.city);
      setArea(existing.area);
      setAvailable(existing.available);
      setLastDonation(existing.lastDonation ?? "");
      setAge(existing.age ? String(existing.age) : "");
      setNotes(existing.notes ?? "");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (status !== "authenticated") {
      setError("Sign in with Google first to save your donor profile.");
      return;
    }
    if (!fullName.trim()) {
      setError("Add your full name.");
      return;
    }
    if (!bloodGroup) {
      setError("Select your blood group.");
      return;
    }
    if (!phone.trim()) {
      setError("Add a phone number so hospitals can reach you.");
      return;
    }
    if (!city.trim() || !area.trim()) {
      setError("Add your city and area for nearby matching.");
      return;
    }

    setSubmitting(true);
    try {
      await saveDonorProfile({
        fullName,
        bloodGroup,
        phone,
        email,
        city,
        area,
        available,
        lastDonation: lastDonation || undefined,
        age: age ? Number(age) : undefined,
        notes,
      });
      router.push("/profile");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save profile. Check Supabase setup.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <StepPanel
        tone="teal"
        step="01"
        title="About you"
        icon={UserRound}
        delayMs={40}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
              placeholder="As it appears on your ID"
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">Age</span>
            <input
              type="number"
              min={18}
              max={65}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
              placeholder="18–65"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              Last donation{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <input
              type="date"
              value={lastDonation}
              onChange={(e) => setLastDonation(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-teal/20 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
            />
          </label>
        </div>
      </StepPanel>

      <StepPanel
        tone="crimson"
        step="02"
        title="Blood group"
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
              {group}
            </button>
          ))}
        </div>
      </StepPanel>

      <StepPanel
        tone="amber"
        step="03"
        title="Contact"
        icon={Phone}
        delayMs={240}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-amber-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
              placeholder="+91 …"
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              Email{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
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
        title="Location & availability"
        icon={MapPin}
        delayMs={340}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink">City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40"
              placeholder="New Delhi"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">Area</span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
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
              {available ? "Available to donate" : "Not available right now"}
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              Toggle anytime from My Profile.
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
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40"
            placeholder="Preferred hours, vehicle, etc."
          />
        </label>
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
        className="shiny-card group relative inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f9f7a] to-[#0a6b54] text-lg font-extrabold text-white shadow-[0_20px_44px_-14px_rgba(15,159,122,0.85)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-70 sm:w-auto sm:min-w-80 sm:px-12"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
          aria-hidden
        />
        {submitting ? (
          <>
            <Loader2 className="relative size-5 animate-spin" /> Saving…
          </>
        ) : (
          <>
            <Sparkles className="relative size-5 opacity-95" aria-hidden />
            <span className="relative">
              {isEdit ? "Save & open My Profile" : "Join & open My Profile"}
            </span>
          </>
        )}
      </button>
    </form>
  );
}
