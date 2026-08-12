"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Info, Sparkles } from "lucide-react";
import type { BloodGroup } from "@/types";
import {
  BLOOD_GROUPS,
  compatibilitySummary,
} from "@/lib/blood-compatibility";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";

type ViewMode = "donate" | "receive";

function AnimatedDroplet({ group, bumpKey }: { group: BloodGroup; bumpKey: number }) {
  return (
    <div className="relative mx-auto flex h-44 w-36 items-center justify-center sm:h-52 sm:w-40">
      {/* Soft ripples */}
      <span
        className="animate-ripple-out absolute size-28 rounded-full bg-crimson/15 sm:size-32"
        aria-hidden
      />
      <span
        className="animate-ripple-out absolute size-28 rounded-full bg-crimson/10 sm:size-32"
        style={{ animationDelay: "0.45s" }}
        aria-hidden
      />

      {/* Tiny falling drips */}
      <span
        className="animate-drip-fall absolute left-[28%] top-2 size-2 rounded-full bg-crimson/70"
        aria-hidden
      />
      <span
        className="animate-drip-fall absolute right-[30%] top-0 size-1.5 rounded-full bg-crimson/50"
        style={{ animationDelay: "0.7s" }}
        aria-hidden
      />

      <div className="animate-droplet-bob relative z-10">
        <div key={bumpKey} className="animate-droplet-squish relative">
          <svg
            viewBox="0 0 120 150"
            className="h-36 w-28 drop-shadow-[0_18px_30px_rgba(196,18,47,0.35)] sm:h-44 sm:w-32"
            aria-hidden
          >
            <defs>
              <linearGradient id="dropFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4d6d" />
                <stop offset="55%" stopColor="#c4122f" />
                <stop offset="100%" stopColor="#8e0c22" />
              </linearGradient>
            </defs>
            <path
              d="M60 8C60 8 18 62 18 98C18 122.3 36.7 142 60 142C83.3 142 102 122.3 102 98C102 62 60 8 60 8Z"
              fill="url(#dropFill)"
            />
            <ellipse cx="44" cy="70" rx="10" ry="16" fill="white" opacity="0.22" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center pt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {group}
          </span>
        </div>
      </div>
    </div>
  );
}

function MatchChip({
  group,
  tone,
  delayMs,
}: {
  group: BloodGroup;
  tone: "donate" | "receive";
  delayMs: number;
}) {
  return (
    <span
      className={cn(
        "animate-pop-in inline-flex min-w-14 items-center justify-center rounded-2xl px-3.5 py-2.5 font-display text-base font-extrabold tracking-tight transition hover:-translate-y-1 hover:scale-105",
        tone === "donate"
          ? "bg-gradient-to-br from-[#ffd6de] to-[#ffb6c4] text-crimson-deep"
          : "bg-gradient-to-br from-[#d4f3f1] to-[#b8e8e4] text-teal-deep",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {group}
    </span>
  );
}

export function CompatibilityChecker() {
  const [selected, setSelected] = useState<BloodGroup>("O+");
  const [mode, setMode] = useState<ViewMode>("donate");
  const [bumpKey, setBumpKey] = useState(0);
  const { t } = useLanguage();
  const { donateTo, receiveFrom } = compatibilitySummary(selected);
  const tip =
    selected === "O-"
      ? t("compat.tipONeg")
      : selected === "AB+"
        ? t("compat.tipABPos")
        : donateTo.length >= 4
          ? t("compat.tipSeveral", { group: selected })
          : t("compat.tipFocused", { group: selected });

  const matches = mode === "donate" ? donateTo : receiveFrom;
  const helpCount = donateTo.length;

  useEffect(() => {
    setBumpKey((k) => k + 1);
  }, [selected]);

  function pickGroup(group: BloodGroup) {
    if (group === selected) {
      setBumpKey((k) => k + 1);
      return;
    }
    setSelected(group);
  }

  return (
    <section
      id="compatibility"
      className="relative scroll-mt-20 overflow-hidden bg-blood-flow px-5 py-12 sm:px-8 sm:py-16"
      aria-labelledby="compat-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-25" aria-hidden />
      <div
        className="pointer-events-none absolute -right-20 top-10 size-72 rounded-full bg-crimson/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-10 size-72 rounded-full bg-teal/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-crimson-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-crimson">
            <Sparkles className="size-3.5" aria-hidden />
            {t("compat.kicker")}
          </p>
          <h2
            id="compat-heading"
            className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl"
          >
            {t("compat.title")}
          </h2>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_28px_70px_-32px_rgba(20,28,34,0.4)] backdrop-blur-sm">
          {/* Top playground */}
          <div className="grid gap-2 border-b border-line/70 lg:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-sm font-bold text-ink">{t("compat.pick")}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {t("compat.pickHint")}
              </p>

              <div
                className="mt-5 grid grid-cols-4 gap-2 sm:gap-2.5"
                role="radiogroup"
                aria-label={t("compat.selectGroup")}
              >
                {BLOOD_GROUPS.map((group) => {
                  const isActive = selected === group;
                  return (
                    <button
                      key={group}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => pickGroup(group)}
                      className={cn(
                        "relative rounded-2xl border px-2 py-3.5 text-center font-display text-base font-extrabold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson focus-visible:ring-offset-2 sm:text-lg",
                        isActive
                          ? "animate-wiggle scale-105 border-crimson bg-crimson text-white shadow-[0_14px_30px_-12px_rgba(196,18,47,0.75)]"
                          : "border-line bg-paper text-ink hover:-translate-y-0.5 hover:border-crimson/45 hover:bg-crimson-soft/60 active:scale-95",
                      )}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center px-4 py-6">
              <AnimatedDroplet group={selected} bumpKey={bumpKey} />
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-ink-muted">
                {t("compat.instant")}
              </p>
              <p
                key={`count-${selected}`}
                className="animate-pop-in mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl"
              >
                {t("compat.helps")}{" "}
                <span className="bg-gradient-to-r from-crimson to-[#ff5a75] bg-clip-text text-transparent">
                  {helpCount}
                </span>{" "}
                {helpCount === 1 ? t("compat.group") : t("compat.groups")}
              </p>
              <p
                key={`tip-${selected}`}
                className="animate-pop-in mt-3 text-sm leading-relaxed text-ink-muted"
                style={{ animationDelay: "80ms" }}
              >
                {tip}
              </p>
            </div>
          </div>

          {/* Mode + matches */}
          <div className="bg-gradient-to-b from-paper/40 to-white p-6 sm:p-8">
            <div
              className="mx-auto flex w-fit rounded-2xl bg-mist/80 p-1.5"
              role="tablist"
              aria-label={t("compat.viewLabel")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "donate"}
                onClick={() => setMode("donate")}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition sm:px-5",
                  mode === "donate"
                    ? "bg-crimson text-white shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {t("compat.wantDonate")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "receive"}
                onClick={() => setMode("receive")}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition sm:px-5",
                  mode === "receive"
                    ? "bg-teal text-white shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {t("compat.needBlood")}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-xl font-display text-xs text-white",
                    mode === "donate" ? "bg-crimson" : "bg-teal",
                  )}
                >
                  {selected}
                </span>
                <ArrowRight className="size-4 text-ink-muted" aria-hidden />
                <span>
                  {mode === "donate"
                    ? t("compat.canDonateTo")
                    : t("compat.canReceiveFrom")}
                </span>
              </p>
            </div>

            <div
              key={`${selected}-${mode}`}
              className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
              aria-live="polite"
            >
              {matches.map((group, index) => (
                <MatchChip
                  key={`${mode}-${group}`}
                  group={group}
                  tone={mode === "donate" ? "donate" : "receive"}
                  delayMs={index * 70}
                />
              ))}
            </div>

            <p className="mx-auto mt-8 flex max-w-xl items-start justify-center gap-2 text-center text-xs leading-relaxed text-ink-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {t("compat.funGuide")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
