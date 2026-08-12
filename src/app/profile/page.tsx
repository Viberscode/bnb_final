"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Droplets,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/components/auth/auth-provider";
import { canDonateTo } from "@/lib/blood-compatibility";
import {
  fetchDonorProfile,
  subscribeDonorProfile,
  updateDonorAvailability,
} from "@/lib/donor-profile";
import {
  fetchLiveRequests,
  subscribeLiveRequests,
} from "@/lib/live-requests";
import { cn } from "@/lib/utils";
import type { BloodRequest, DonorProfile } from "@/types";

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  tone: "teal" | "crimson" | "amber" | "slate";
}) {
  return (
    <div className="request-step-panel p-5" data-tone={tone}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-xl text-white",
            tone === "teal" && "bg-gradient-to-br from-teal to-teal-deep",
            tone === "crimson" &&
              "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
            tone === "amber" &&
              "bg-gradient-to-br from-amber-400 to-orange-600",
            tone === "slate" &&
              "bg-gradient-to-br from-sky-400 to-blue-600",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {value}
      </p>
    </div>
  );
}

function MatchCard({ request }: { request: BloodRequest }) {
  return (
    <article className="rounded-2xl border border-line bg-white/90 p-4 transition hover:-translate-y-1 hover:border-teal/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] font-display text-lg font-extrabold text-white">
          {request.bloodGroup}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
            request.urgency === "critical" && "bg-[#fff1f3] text-[#c4122f]",
            request.urgency === "urgent" && "bg-amber-50 text-amber-800",
            request.urgency === "planned" && "bg-teal-soft text-teal-deep",
          )}
        >
          {request.urgency}
        </span>
      </div>
      <p className="mt-3 font-semibold text-ink">{request.hospitalName}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
        <MapPin className="size-3" aria-hidden />
        {request.hospitalArea}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {request.units} unit{request.units > 1 ? "s" : ""} · {request.contactName}
      </p>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-teal-deep text-white shadow-[0_16px_32px_-14px_rgba(13,115,112,0.7)]">
        <UserRound className="size-7" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        No donor profile yet
      </h1>
      <p className="mt-3 text-ink-muted sm:text-lg">
        Join as a donor first — then your dashboard, availability, and matching
        requests live here.
      </p>
      <Link
        href="/become-donor"
        className="mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f9f7a] to-[#0a6b54] px-8 text-base font-bold text-white shadow-[0_16px_36px_-14px_rgba(15,159,122,0.75)]"
      >
        Become a Donor
        <ArrowUpRight className="size-5" aria-hidden />
      </Link>
    </div>
  );
}

function ProfileDashboard({
  profile,
  onToggle,
  matches,
}: {
  profile: DonorProfile;
  onToggle: (next: boolean) => void;
  matches: BloodRequest[];
}) {
  const joined = new Date(profile.joinedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <section
        className="request-step-panel overflow-hidden p-6 sm:p-8"
        data-tone="teal"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] font-display text-2xl font-extrabold text-white shadow-[0_16px_32px_-12px_rgba(196,18,47,0.75)] sm:size-20 sm:text-3xl">
              {profile.bloodGroup}
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-deep">
                My Profile
              </p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
                {profile.fullName}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {profile.area}, {profile.city}
                </span>
                <span>· Joined {joined}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggle(!profile.available)}
            className={cn(
              "inline-flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition",
              profile.available
                ? "border-teal bg-teal-soft/80"
                : "border-slate-200 bg-white",
            )}
          >
            <span
              className={cn(
                "size-3 rounded-full",
                profile.available
                  ? "animate-pulse bg-emerald-500"
                  : "bg-slate-400",
              )}
            />
            <span>
              <span className="block font-display text-lg font-extrabold text-ink">
                {profile.available ? "On standby" : "Offline"}
              </span>
              <span className="text-xs text-ink-muted">Tap to toggle</span>
            </span>
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Trust score"
          value={`${profile.trustScore}`}
          icon={ShieldCheck}
          tone="teal"
        />
        <StatCard
          label="Donations"
          value={`${profile.donationsCompleted}`}
          icon={Droplets}
          tone="crimson"
        />
        <StatCard
          label="Lives helped"
          value={`${profile.livesHelped}`}
          icon={HeartHandshake}
          tone="amber"
        />
        <StatCard
          label="Avg response"
          value={`${profile.avgResponseMinutes}m`}
          icon={Clock3}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className="request-step-panel p-6 sm:p-7"
          data-tone="slate"
        >
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Profile details
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Blood group", profile.bloodGroup],
              ["Phone", profile.phone],
              ["Email", profile.email || "—"],
              ["Age", profile.age ? String(profile.age) : "—"],
              [
                "Last donation",
                profile.lastDonation
                  ? new Date(profile.lastDonation).toLocaleDateString("en-IN")
                  : "—",
              ],
              ["Notes", profile.notes || "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-line bg-white/80 px-4 py-3"
              >
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  {label}
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-semibold text-ink">
                  {label === "Phone" ? (
                    <Phone className="size-3.5 text-ink-muted" aria-hidden />
                  ) : null}
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/become-donor"
              className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-black/[0.02]"
            >
              Edit details
            </Link>
            <Link
              href="/requests"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-crimson px-4 text-sm font-bold text-white hover:bg-crimson-deep"
            >
              Browse live requests
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        <section
          className="request-step-panel p-6 sm:p-7"
          data-tone="crimson"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Matches for you
            </h2>
            <Activity className="size-5 text-crimson" aria-hidden />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Open requests your {profile.bloodGroup} can support.
          </p>
          <div className="mt-5 space-y-3">
            {matches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-8 text-center text-sm text-ink-muted">
                No matching live requests right now. Stay on standby.
              </p>
            ) : (
              matches.slice(0, 3).map((request) => (
                <MatchCard key={request.id} request={request} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, status } = useAuth();
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const [nextProfile, nextRequests] = await Promise.all([
        fetchDonorProfile(user?.id),
        fetchLiveRequests(),
      ]);
      if (!active) return;
      setProfile(nextProfile);
      setRequests(nextRequests);
      setReady(true);
    };

    void refresh();
    const unsubRequests = subscribeLiveRequests(() => {
      void refresh();
    });
    const unsubProfile = user?.id
      ? subscribeDonorProfile(user.id, () => {
          void refresh();
        })
      : () => undefined;

    return () => {
      active = false;
      unsubRequests();
      unsubProfile();
    };
  }, [user?.id]);

  const matches = useMemo(() => {
    if (!profile) return [];
    const canHelp = new Set(canDonateTo(profile.bloodGroup));
    return requests.filter((r) => canHelp.has(r.bloodGroup));
  }, [profile, requests]);

  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line/70 bg-white/80 backdrop-blur-md"
      />
      <main className="relative flex-1 overflow-hidden bg-blood-flow">
        <div
          className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          {!ready || status === "loading" ? (
            <p className="text-center text-ink-muted">Loading profile…</p>
          ) : profile ? (
            <ProfileDashboard
              profile={profile}
              matches={matches}
              onToggle={(next) => {
                void updateDonorAvailability(next).then((updated) => {
                  if (updated) setProfile(updated);
                });
              }}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
