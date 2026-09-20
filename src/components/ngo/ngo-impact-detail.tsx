"use client";

import {
  Gift,
  HeartHandshake,
  MapPin,
  Users,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { MessagePath } from "@/components/i18n/language-provider";
import {
  NGO_IMPACT_REWARDS,
  ngoRewardProgress,
  themeForNgo,
  type NgoDirectoryEntry,
} from "@/lib/ngo-showcase";
import { cn } from "@/lib/utils";

export function NgoImpactDetail({ entry }: { entry: NgoDirectoryEntry }) {
  const { t } = useLanguage();
  const theme = themeForNgo(entry.id);
  const unlocked = NGO_IMPACT_REWARDS.filter(
    (reward) => entry.verifiedDonations >= reward.threshold,
  ).length;
  const nextReward = NGO_IMPACT_REWARDS.find(
    (reward) => entry.verifiedDonations < reward.threshold,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider",
            theme.badge,
          )}
        >
          {entry.source === "sample" ? t("ngo.sampleTag") : t("ngo.registered")}
        </span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-emerald-800">
          {t("ngo.rewardsUnlocked", { n: unlocked, total: NGO_IMPACT_REWARDS.length })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={HeartHandshake}
          label={t("ngo.verifiedDonationsLabel")}
          value={String(entry.verifiedDonations)}
          className="border-crimson/15 bg-crimson/5 text-crimson"
        />
        <StatCard
          icon={Users}
          label={t("ngo.volunteersLabel")}
          value={String(entry.volunteers)}
          className={cn("border-transparent", theme.card, theme.accent)}
        />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm shadow-[0_12px_28px_-22px_rgba(28,13,20,0.4)]">
        <p className="font-black text-ink">
          {t("ngo.regNo")} · {entry.registrationNo}
        </p>
        <p className="mt-2 flex items-start gap-1.5 font-semibold text-ink-muted">
          <MapPin className={cn("mt-0.5 size-3.5 shrink-0", theme.accent)} aria-hidden />
          {entry.address}
        </p>
        <p className="mt-1 font-semibold text-ink-muted">
          {t("ngo.person")}: {entry.authorizedPerson}
        </p>
      </div>

      {nextReward ? (
        <p className="text-xs font-bold text-ink-muted">
          {t("ngo.nextUnlock", { n: nextReward.threshold })}
        </p>
      ) : (
        <p className="text-xs font-bold text-emerald-700">{t("ngo.allRewardsUnlocked")}</p>
      )}

      <div>
        <h3 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-ink">
          <Gift className={cn("size-4", theme.accent)} aria-hidden />
          {t("ngo.impactRewardsTitle")}
        </h3>
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          {t("ngo.impactRewardsBody")}
        </p>
        <ul className="mt-3 space-y-2">
          {NGO_IMPACT_REWARDS.map((reward) => {
            const earned = entry.verifiedDonations >= reward.threshold;
            const progress = ngoRewardProgress(
              entry.verifiedDonations,
              reward.threshold,
            );
            return (
              <li
                key={reward.id}
                className={cn(
                  "rounded-2xl border p-3",
                  earned
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-white/80 bg-white/75",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] font-black uppercase tracking-wider text-ink-muted">
                      {t("ngo.atDonations", { n: reward.threshold })}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {t(reward.titleKey as MessagePath)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink-muted">
                      {t(reward.bodyKey as MessagePath)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider",
                      earned
                        ? "bg-emerald-600 text-white"
                        : "bg-black/5 text-ink-muted",
                    )}
                  >
                    {earned ? t("ngo.rewardUnlocked") : t("ngo.rewardLocked")}
                  </span>
                </div>
                {!earned ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
                    <div
                      className={cn("h-full rounded-full", theme.progress)}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-3", className)}>
      <Icon className="size-4" aria-hidden />
      <p className="mt-2 text-[0.65rem] font-black uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="font-display text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
