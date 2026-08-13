"use client";

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
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";
import type { DonorProfile } from "@/types";

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
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-xl text-white",
          tone === "teal" && "bg-gradient-to-br from-teal to-teal-deep",
          tone === "crimson" &&
            "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
          tone === "amber" &&
            "bg-gradient-to-br from-amber-400 to-orange-600",
          tone === "slate" && "bg-gradient-to-br from-sky-400 to-blue-600",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}

export function ProfileDashboard({
  profile,
  onToggle,
}: {
  profile: DonorProfile;
  onToggle: (next: boolean) => void;
}) {
  const { t, locale } = useLanguage();
  const joined = new Date(profile.joinedAt).toLocaleDateString(
    locale === "hi" ? "hi-IN" : "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  return (
    <div className="space-y-5">
      <section
        className="request-step-panel overflow-hidden p-5 sm:p-6"
        data-tone="teal"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] font-display text-xl font-extrabold text-white shadow-[0_14px_28px_-12px_rgba(196,18,47,0.7)] sm:size-16 sm:text-2xl">
              {profile.bloodGroup}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-deep">
                {t("profile.donorProfile")}
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {profile.fullName}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {profile.area}, {profile.city}
                </span>
                <span>· {t("profile.joined")} {joined}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggle(!profile.available)}
            className={cn(
              "inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
              profile.available
                ? "border-teal bg-teal-soft/80"
                : "border-slate-200 bg-white",
            )}
          >
            <span
              className={cn(
                "size-2.5 rounded-full",
                profile.available
                  ? "animate-pulse bg-emerald-500"
                  : "bg-slate-400",
              )}
            />
            <span>
              <span className="block font-display text-base font-extrabold text-ink">
                {profile.available ? t("profile.onStandby") : t("profile.offline")}
              </span>
              <span className="text-xs text-ink-muted">{t("profile.tapToggle")}</span>
            </span>
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("profile.trust")}
          value={`${profile.trustScore}`}
          icon={ShieldCheck}
          tone="teal"
        />
        <StatCard
          label={t("profile.donations")}
          value={`${profile.donationsCompleted}`}
          icon={Droplets}
          tone="crimson"
        />
        <StatCard
          label={t("profile.livesHelped")}
          value={`${profile.livesHelped}`}
          icon={HeartHandshake}
          tone="amber"
        />
        <StatCard
          label={t("profile.avgResponse")}
          value={`${profile.avgResponseMinutes}m`}
          icon={Clock3}
          tone="slate"
        />
      </div>

      <section className="request-step-panel p-5 sm:p-6" data-tone="slate">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
            {t("profile.details")}
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [t("profile.bloodGroup"), profile.bloodGroup, "group"],
              [t("profile.phone"), profile.phone, "phone"],
              [t("profile.email"), profile.email || "—", "email"],
              [t("profile.age"), profile.age ? String(profile.age) : "—", "age"],
              [
                t("profile.lastDonation"),
                profile.lastDonation
                  ? new Date(profile.lastDonation).toLocaleDateString(
                      locale === "hi" ? "hi-IN" : "en-IN",
                    )
                  : "—",
                "last",
              ],
              [t("profile.notes"), profile.notes || "—", "notes"],
            ].map(([label, value, key]) => (
              <div
                key={key}
                className="rounded-xl border border-line bg-white/80 px-3.5 py-2.5"
              >
                <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  {label}
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
                  {key === "phone" ? (
                    <Phone className="size-3.5 text-ink-muted" aria-hidden />
                  ) : null}
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/become-donor"
              className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-3.5 text-sm font-bold text-ink hover:bg-black/[0.02]"
            >
              {t("profile.editDetails")}
            </Link>
            <Link
              href="/requests"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-crimson px-3.5 text-sm font-bold text-white hover:bg-crimson-deep"
            >
              {t("profile.browseLive")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
      </section>
    </div>
  );
}
