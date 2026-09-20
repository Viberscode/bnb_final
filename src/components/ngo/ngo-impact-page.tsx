"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCheck,
  Gift,
  HeartHandshake,
  Lock,
  MapPin,
  Package,
  Shield,
  Snowflake,
  Sparkles,
  Stethoscope,
  Tablet,
  Thermometer,
  Truck,
  Users,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { MessagePath } from "@/components/i18n/language-provider";
import {
  isImpactPartner,
  NGO_IMPACT_REWARDS,
  ngoInitials,
  ngoRewardProgress,
  ngoTier,
  themeForNgo,
  type NgoDirectoryEntry,
} from "@/lib/ngo-showcase";
import { NgoLocationMap } from "@/components/ngo/ngo-location-map";
import { cn } from "@/lib/utils";

export function NgoImpactPage({ entry }: { entry: NgoDirectoryEntry }) {
  const { t } = useLanguage();
  const theme = themeForNgo(entry.id);
  const unlockedRewards = NGO_IMPACT_REWARDS.filter(
    (reward) => entry.verifiedDonations >= reward.threshold,
  );
  const lockedRewards = NGO_IMPACT_REWARDS.filter(
    (reward) => entry.verifiedDonations < reward.threshold,
  );
  const nextReward = NGO_IMPACT_REWARDS.find(
    (reward) => entry.verifiedDonations < reward.threshold,
  );
  const progressToNext = nextReward
    ? ngoRewardProgress(entry.verifiedDonations, nextReward.threshold)
    : 100;
  const remaining = nextReward
    ? Math.max(0, nextReward.threshold - entry.verifiedDonations)
    : 0;
  const tier = ngoTier(entry.verifiedDonations);

  return (
    <div className="relative overflow-hidden">
      <span
        className={cn(
          "pointer-events-none absolute -left-24 top-0 size-[28rem] rounded-full blur-3xl",
          theme.glow,
        )}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute -right-16 top-40 size-80 rounded-full blur-3xl",
          theme.glow,
        )}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
        <Link
          href="/partners"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t("ngo.backToGrid")}
        </Link>

        <section
          className={cn(
            "relative mt-5 overflow-hidden rounded-[1.85rem] border p-6 sm:p-8",
            theme.card,
          )}
        >
          <span
            className={cn("absolute inset-y-0 left-0 w-2", theme.bar)}
            aria-hidden
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch">
            <div className="flex min-w-0 items-start gap-4 pl-2">
              <span
                className={cn(
                  "inline-flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-[0_14px_28px_-12px_rgba(28,13,20,0.45)] sm:size-[4.5rem] sm:text-2xl",
                  theme.avatar,
                )}
              >
                {ngoInitials(entry.name)}
              </span>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.18em] text-ink-muted">
                  <Shield className={cn("size-3.5", theme.accent)} aria-hidden />
                  {t("ngo.pageSubtitle")}
                </p>
                <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-ink sm:text-5xl">
                  {entry.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm font-semibold text-ink-muted sm:text-base">
                  {t("ngo.impactDetailBody")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider",
                      theme.badge,
                    )}
                  >
                    {isImpactPartner(entry)
                      ? t("ngo.livePartner")
                      : t("ngo.registered")}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider text-emerald-800">
                    {t("ngo.rewardsUnlocked", {
                      n: unlockedRewards.length,
                      total: NGO_IMPACT_REWARDS.length,
                    })}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider ring-1",
                      theme.pill,
                    )}
                  >
                    {t(
                      tier === "leader"
                        ? "ngo.tierLeader"
                        : tier === "active"
                          ? "ngo.tierActive"
                          : tier === "growing"
                            ? "ngo.tierGrowing"
                            : "ngo.tierNew",
                    )}
                  </span>
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-ink">
                  <MapPin className={cn("mt-0.5 size-4 shrink-0", theme.accent)} aria-hidden />
                  {entry.address}
                </p>
              </div>
            </div>
            <div className="relative min-h-[220px] overflow-hidden rounded-[1.35rem] border border-white/70 bg-white shadow-[0_12px_28px_-18px_rgba(28,13,20,0.35)]">
              <NgoLocationMap
                lat={entry.lat}
                lng={entry.lng}
                name={entry.name}
                accent={theme.pin}
                className="h-[220px] sm:h-[240px] lg:h-full lg:min-h-[240px]"
              />
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wider text-ink shadow-sm">
                {t("ngo.demoMap")}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={HeartHandshake}
            label={t("ngo.verifiedDonationsLabel")}
            count={entry.verifiedDonations}
            hint={t("ngo.donationCount", { n: entry.verifiedDonations })}
            className="border-crimson/20 bg-gradient-to-br from-white to-[#fff1f4] text-crimson"
          />
          <StatTile
            icon={Users}
            label={t("ngo.volunteersLabel")}
            count={entry.volunteers}
            hint={t("ngo.volunteerCount", { n: entry.volunteers })}
            className="border-sky-200 bg-gradient-to-br from-white to-sky-50 text-sky-700"
          />
          <StatTile
            icon={Gift}
            label={t("ngo.impactRewardsTitle")}
            count={unlockedRewards.length}
            suffix={`/${NGO_IMPACT_REWARDS.length}`}
            hint={t("ngo.rewardsShort", {
              n: unlockedRewards.length,
              total: NGO_IMPACT_REWARDS.length,
            })}
            className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50 text-emerald-700"
          />
          <StatTile
            icon={Sparkles}
            label={t("ngo.nextMilestone")}
            count={nextReward?.threshold}
            fallback={t("ngo.maxTier")}
            hint={
              nextReward
                ? t("ngo.donationsToGo", { n: remaining })
                : t("ngo.allRewardsUnlocked")
            }
            className={cn("border-white/80", theme.card, theme.accent)}
          />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[1.6rem] border border-white/80 bg-white p-6 shadow-[0_16px_40px_-28px_rgba(28,13,20,0.35)]">
            <h2 className="font-display text-2xl font-black tracking-tight text-ink">
              🏛️ {t("ngo.aboutOrg")}
            </h2>
            <p className="mt-1 font-display text-lg font-black text-ink">{entry.name}</p>
            <div className="mt-5 space-y-3">
              <InfoRow emoji="🪪" label={t("ngo.regNo")} value={entry.registrationNo} />
              <InfoRow emoji="📍" label={t("ngo.address")} value={entry.address} />
              <InfoRow emoji="👤" label={t("ngo.person")} value={entry.authorizedPerson} />
            </div>
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-[1.6rem] border p-6",
              theme.card,
            )}
          >
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-ink-muted">
              🎯 {t("ngo.nextMilestone")}
            </p>
            {nextReward ? (
              <>
                <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-ink">
                  {t(nextReward.titleKey as MessagePath)}
                </h2>
                <p className="mt-2 text-sm font-semibold text-ink-muted">
                  {t(nextReward.bodyKey as MessagePath)}
                </p>
                <p className="mt-4 text-sm font-black text-ink">
                  {t("ngo.nextUnlock", { n: nextReward.threshold })}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="font-display text-5xl font-black leading-none tracking-tight text-ink">
                    {progressToNext}%
                  </p>
                  <p className="pb-1 text-right text-sm font-black uppercase tracking-wide text-crimson">
                    {t("ngo.donationsToGo", { n: remaining })}
                  </p>
                </div>
                <div className="ngo-energy-bar mt-3">
                  <div
                    className="ngo-energy-bar__fill"
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-ink">
                  {t("ngo.allRewardsUnlocked")}
                </h2>
                <p className="mt-2 text-sm font-semibold text-ink-muted">
                  {t("ngo.impactRewardsBody")}
                </p>
              </>
            )}
          </div>
        </section>

        <section className="mt-8 space-y-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
              <Gift className={cn("size-5", theme.accent)} aria-hidden />
              {t("ngo.impactRewardsTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-ink-muted">
              {t("ngo.impactRewardsBody")}
            </p>
          </div>

          {unlockedRewards.length > 0 ? (
            <div className="ngo-reward-box ngo-reward-box--unlocked pt-8">
              <span className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-white shadow-[0_8px_18px_-8px_rgba(5,150,105,0.85)]">
                <CheckCheck className="size-5" strokeWidth={2.6} aria-hidden />
                <span className="sr-only">{t("ngo.rewardUnlocked")}</span>
              </span>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-black tracking-tight text-emerald-950 sm:text-2xl">
                    {t("ngo.unlockedSection")}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-ink-muted">
                    {t("ngo.unlockedSectionHint")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider text-white">
                  {unlockedRewards.length}
                </span>
              </div>
              <UnlockedRewardChain
                rewards={unlockedRewards}
                donations={entry.verifiedDonations}
                progressClass={theme.progress}
              />
            </div>
          ) : null}

          {lockedRewards.length > 0 ? (
            <div className="ngo-reward-box ngo-reward-box--locked">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {t("ngo.lockedSection")}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-ink-muted">
                    {t("ngo.lockedSectionHint")}
                  </p>
                </div>
                <span className="rounded-full bg-slate-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider text-white">
                  {lockedRewards.length}
                </span>
              </div>
              <div
                className={cn(
                  "grid gap-3",
                  lockedRewards.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
                )}
              >
                {lockedRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    earned={false}
                    tone={0}
                    donations={entry.verifiedDonations}
                    progress={ngoRewardProgress(
                      entry.verifiedDonations,
                      reward.threshold,
                    )}
                    progressClass={theme.progress}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const UNLOCKED_TONES = [
  {
    card: "ngo-reward-card--sky border-sky-300 bg-gradient-to-br from-sky-50 to-white",
    icon: "bg-sky-600 text-white",
    badge: "bg-sky-600 text-white",
  },
  {
    card: "ngo-reward-card--violet border-violet-300 bg-gradient-to-br from-violet-50 to-white",
    icon: "bg-violet-600 text-white",
    badge: "bg-violet-600 text-white",
  },
  {
    card: "ngo-reward-card--amber border-amber-300 bg-gradient-to-br from-amber-50 to-white",
    icon: "bg-amber-500 text-white",
    badge: "bg-amber-500 text-white",
  },
  {
    card: "ngo-reward-card--rose border-rose-300 bg-gradient-to-br from-rose-50 to-white",
    icon: "bg-rose-500 text-white",
    badge: "bg-rose-500 text-white",
  },
] as const;

const CHAIN_LOOP = 10000;

function UnlockedRewardChain({
  rewards,
  donations,
  progressClass,
}: {
  rewards: (typeof NGO_IMPACT_REWARDS)[number][];
  donations: number;
  progressClass: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      setTick((now - start) % CHAIN_LOOP);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const linkSpan = 700;
  const linkStart = (index: number) => 1600 + index * 2400;

  return (
    <ol
      className={cn(
        "grid items-stretch gap-4",
        rewards.length === 1 && "grid-cols-1",
        rewards.length === 2 &&
          "md:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)]",
        rewards.length === 3 &&
          "md:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)]",
        rewards.length >= 4 &&
          "lg:grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)_3.25rem_minmax(0,1fr)_3.25rem_minmax(0,1fr)]",
      )}
    >
      {rewards.map((reward, index) => {
        const showLink = index < rewards.length - 1;
        const startAt = linkStart(index);
        const active = tick >= startAt;
        const progress = Math.min(1, Math.max(0, (tick - startAt) / linkSpan));
        const firstLink = index === 0;
        const stroke = active
          ? firstLink
            ? "#ff2d4a"
            : "#22c55e"
          : firstLink
            ? "rgba(255,45,74,0.22)"
            : "rgba(34,197,94,0.22)";

        return (
          <div key={reward.id} className="contents">
            <RewardCard
              reward={reward}
              earned
              tone={index}
              donations={donations}
              progress={100}
              progressClass={progressClass}
            />
            {showLink ? (
              <div
                className={cn(
                  "relative z-0 hidden min-w-0 items-center justify-center self-center",
                  rewards.length >= 4 ? "lg:flex" : "md:flex",
                )}
                aria-hidden
              >
                <svg
                  viewBox="0 0 80 48"
                  className="h-11 w-full max-w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 24H18L26 24L36 8L46 40L56 16L64 24H80"
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="140"
                    strokeDashoffset={140 * (1 - progress)}
                    className={cn(
                      active &&
                        progress >= 1 &&
                        (firstLink ? "how-beep-glow" : "how-beep-glow-green"),
                    )}
                  />
                </svg>
              </div>
            ) : null}
          </div>
        );
      })}
    </ol>
  );
}

const REWARD_VISUAL: Record<
  string,
  {
    Icon: typeof Gift;
    in1: MessagePath;
    in2: MessagePath;
  }
> = {
  "ngo-reward-25": { Icon: Stethoscope, in1: "ngo.reward25In1", in2: "ngo.reward25In2" },
  "ngo-reward-50": { Icon: Snowflake, in1: "ngo.reward50In1", in2: "ngo.reward50In2" },
  "ngo-reward-100": { Icon: Tablet, in1: "ngo.reward100In1", in2: "ngo.reward100In2" },
  "ngo-reward-250": { Icon: Thermometer, in1: "ngo.reward250In1", in2: "ngo.reward250In2" },
  "ngo-reward-500": { Icon: Truck, in1: "ngo.reward500In1", in2: "ngo.reward500In2" },
};

function RewardCard({
  reward,
  earned,
  tone = 0,
  donations,
  progress,
  progressClass,
}: {
  reward: (typeof NGO_IMPACT_REWARDS)[number];
  earned: boolean;
  tone?: number;
  donations: number;
  progress: number;
  progressClass: string;
}) {
  const { t } = useLanguage();
  const visual = REWARD_VISUAL[reward.id] ?? {
    Icon: Package,
    in1: "ngo.rewardInside" as MessagePath,
    in2: "ngo.rewardInside" as MessagePath,
  };
  const Icon = visual.Icon;
  const needed = Math.max(0, reward.threshold - donations);
  const palette = UNLOCKED_TONES[tone % UNLOCKED_TONES.length];

  return (
    <article
      className={cn(
        "ngo-reward-card flex min-h-[220px] flex-col border-2 p-4",
        earned ? palette.card : "ngo-reward-card--locked",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-xl",
            earned ? palette.icon : "bg-slate-200 text-slate-600",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wider",
            earned ? palette.badge : "bg-slate-200 text-slate-700",
          )}
        >
          {earned ? (
            <CheckCheck className="size-3.5" strokeWidth={2.6} aria-hidden />
          ) : (
            <Lock className="size-3" aria-hidden />
          )}
          {earned ? t("ngo.rewardUnlocked") : t("ngo.rewardLocked")}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-display font-black tracking-tight text-ink",
          earned
            ? "text-2xl leading-none sm:text-[1.85rem]"
            : "text-[0.7rem] uppercase tracking-wider text-ink-muted",
        )}
      >
        {t("ngo.atDonations", { n: reward.threshold })}
      </p>
      <p className="mt-1 font-display text-lg font-black tracking-tight text-ink">
        {t(reward.titleKey as MessagePath)}
      </p>
      <p className="mt-2 text-sm font-semibold text-ink-muted">
        {t(reward.bodyKey as MessagePath)}
      </p>
      {earned ? (
        <div className="mt-auto" />
      ) : (
        <div className="mt-auto space-y-3 pt-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-2.5">
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500">
              {t("ngo.rewardInside")}
            </p>
            <ul className="mt-1.5 space-y-1 text-xs font-bold text-ink">
              <li className="flex items-center gap-1.5">
                <Gift className="size-3 text-amber-600" aria-hidden />
                {t(visual.in1)}
              </li>
              <li className="flex items-center gap-1.5">
                <Package className="size-3 text-amber-600" aria-hidden />
                {t(visual.in2)}
              </li>
            </ul>
          </div>
          <div className="flex items-center justify-between text-[0.65rem] font-black uppercase tracking-wider text-slate-600">
            <span>{progress}%</span>
            <span>{t("ngo.stillNeeded", { n: needed })}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={cn("h-full rounded-full", progressClass)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function InfoRow({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-black/[0.04] bg-[#f8fafc] px-3 py-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-[0_6px_14px_-10px_rgba(15,23,42,0.4)]">
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-black uppercase tracking-wider text-ink-muted">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-black text-ink">{value}</p>
      </div>
    </div>
  );
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

function StatTile({
  icon: Icon,
  label,
  count,
  suffix = "",
  fallback,
  hint,
  className,
}: {
  icon: typeof Users;
  label: string;
  count?: number;
  suffix?: string;
  fallback?: string;
  hint: string;
  className?: string;
}) {
  const animated = useCountUp(count ?? 0);
  const display =
    typeof count === "number" ? `${animated}${suffix}` : (fallback ?? "—");

  return (
    <div
      className={cn(
        "rounded-[1.4rem] border p-5 shadow-[0_14px_32px_-26px_rgba(28,13,20,0.4)]",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
      <p className="mt-3 text-[0.65rem] font-black uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-4xl font-black tracking-tight text-ink tabular-nums">
        {display}
      </p>
      <p className="mt-1 text-xs font-bold text-ink-muted">{hint}</p>
    </div>
  );
}
