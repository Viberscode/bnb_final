"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Clock3,
  Droplets,
  Users,
} from "lucide-react";
import type { NetworkStats } from "@/types";
import { cn } from "@/lib/utils";

interface NetworkStatusProps {
  stats: NetworkStats;
}

function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

const METRICS = [
  {
    key: "donors",
    label: "Donors on standby",
    icon: Users,
    tone: "emerald",
    getValue: (s: NetworkStats) => s.donorsOnStandby,
  },
  {
    key: "fulfilled",
    label: "Fulfilled this month",
    icon: Droplets,
    tone: "crimson",
    getValue: (s: NetworkStats) => s.requestsFulfilledThisMonth,
  },
  {
    key: "response",
    label: "Avg response",
    icon: Clock3,
    tone: "sky",
    getValue: (s: NetworkStats) => s.avgResponseMinutes,
    suffix: " min",
  },
  {
    key: "critical",
    label: "Critical open",
    icon: Activity,
    tone: "amber",
    getValue: (s: NetworkStats) => s.activeCriticalRequests,
  },
  {
    key: "partners",
    label: "Partner orgs",
    icon: Building2,
    tone: "slate",
    getValue: (s: NetworkStats) => s.partnerOrgs,
  },
] as const;

const TONE_STYLES = {
  emerald: {
    card: "from-emerald-50 via-white to-teal-50 ring-emerald-200/70",
    icon: "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,0.75)]",
    label: "text-emerald-700",
    value: "bg-gradient-to-br from-emerald-700 to-teal-600 bg-clip-text text-transparent",
  },
  crimson: {
    card: "from-rose-50 via-white to-red-50 ring-rose-200/70",
    icon: "bg-gradient-to-br from-rose-400 to-red-600 text-white shadow-[0_10px_24px_-10px_rgba(225,29,72,0.7)]",
    label: "text-rose-700",
    value: "bg-gradient-to-br from-rose-700 to-red-600 bg-clip-text text-transparent",
  },
  sky: {
    card: "from-sky-50 via-white to-blue-50 ring-sky-200/70",
    icon: "bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_10px_24px_-10px_rgba(14,165,233,0.7)]",
    label: "text-sky-700",
    value: "bg-gradient-to-br from-sky-700 to-blue-600 bg-clip-text text-transparent",
  },
  amber: {
    card: "from-amber-50 via-white to-orange-50 ring-amber-200/70",
    icon: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_10px_24px_-10px_rgba(245,158,11,0.7)]",
    label: "text-amber-800",
    value: "bg-gradient-to-br from-amber-700 to-orange-600 bg-clip-text text-transparent",
  },
  slate: {
    card: "from-slate-50 via-white to-zinc-50 ring-slate-200/80",
    icon: "bg-gradient-to-br from-slate-500 to-zinc-700 text-white shadow-[0_10px_24px_-10px_rgba(51,65,85,0.65)]",
    label: "text-slate-700",
    value: "bg-gradient-to-br from-slate-800 to-zinc-600 bg-clip-text text-transparent",
  },
} as const;

function MetricCard({
  label,
  value,
  suffix = "",
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof Users;
  tone: keyof typeof TONE_STYLES;
}) {
  const display = useCountUp(value);
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "group relative cursor-default overflow-hidden rounded-2xl bg-gradient-to-br p-5 ring-1 transition duration-300 ease-out sm:p-6",
        "hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_22px_40px_-18px_rgba(20,28,34,0.35)] hover:ring-2",
        "active:translate-y-0 active:scale-[1.01]",
        styles.card,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/40 opacity-0 transition duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:-rotate-3 sm:size-11",
            styles.icon,
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>

      <p
        className={cn(
          "relative mt-5 text-[0.7rem] font-bold uppercase tracking-[0.14em] sm:text-xs",
          styles.label,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "relative mt-2 font-display text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl",
          styles.value,
        )}
      >
        {display.toLocaleString("en-IN")}
        {suffix ? (
          <span className="ml-1 text-xl font-bold text-ink-muted sm:text-2xl">
            {suffix.trim()}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function NetworkStatus({ stats }: NetworkStatusProps) {
  return (
    <section
      id="network"
      className="relative scroll-mt-20 overflow-hidden bg-blood-flow px-5 py-12 sm:px-8 sm:py-14"
      aria-labelledby="network-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 flex items-end gap-1" aria-hidden>
              {[10, 16, 12, 22, 14, 20, 11, 18, 13].map((h, i) => (
                <span
                  key={i}
                  className="animate-heartbeat w-1.5 rounded-full bg-gradient-to-t from-crimson to-rose-400"
                  style={{ height: h, animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
            <h2
              id="network-heading"
              className="font-display text-[2.35rem] font-extrabold leading-none tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl"
            >
              Network{" "}
              <span className="network-pulse-word inline-block bg-gradient-to-r from-[#c4122f] via-[#ff2d4a] to-[#9f1239] bg-clip-text text-transparent">
                pulse
              </span>
            </h2>
            <p className="mt-2 text-sm text-ink-muted sm:text-base">
              Standby donors, fulfilled requests, and response speed — live feel
              of the BloodKit network.
            </p>
          </div>

          {stats.isDemo && (
            <p className="w-fit rounded-full border border-teal/25 bg-gradient-to-r from-teal-soft to-white px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-teal-deep shadow-sm">
              Demo data · not live yet
            </p>
          )}
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_24px_60px_-30px_rgba(20,28,34,0.35)] backdrop-blur-sm sm:p-7 sm:pb-9">
          <div className="mb-6 hidden h-12 items-center rounded-xl bg-gradient-to-r from-rose-50 via-white to-teal-50 px-4 ring-1 ring-rose-100 md:flex" aria-hidden>
            <svg viewBox="0 0 900 64" className="h-full w-full text-rose-500" fill="none">
              <path
                d="M0 32H140L160 32L180 8L200 56L220 20L240 32H380L400 32L420 12L440 52L460 24L480 32H620L640 32L660 6L680 58L700 18L720 32H900"
                stroke="url(#pulseGrad)"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse-draw opacity-90"
              />
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="900" y2="0">
                  <stop stopColor="#e11d48" />
                  <stop offset="0.5" stopColor="#fb7185" />
                  <stop offset="1" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {METRICS.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={metric.getValue(stats)}
                suffix={"suffix" in metric ? metric.suffix : ""}
                icon={metric.icon}
                tone={metric.tone}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
