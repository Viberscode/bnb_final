"use client";

import Link from "next/link";
import { Gift, HeartHandshake, MapPin, Shield } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  isImpactPartner,
  NGO_IMPACT_REWARDS,
  ngoInitials,
  ngoRewardProgress,
  ngoTier,
  themeForNgo,
  type NgoDirectoryEntry,
} from "@/lib/ngo-showcase";
import { cn } from "@/lib/utils";

export function NgoPartnerCard({
  entry,
  highlighted,
}: {
  entry: NgoDirectoryEntry;
  highlighted?: boolean;
}) {
  const { t } = useLanguage();
  const theme = themeForNgo(entry.id);
  const unlocked = NGO_IMPACT_REWARDS.filter(
    (reward) => entry.verifiedDonations >= reward.threshold,
  ).length;
  const nextReward = NGO_IMPACT_REWARDS.find(
    (reward) => entry.verifiedDonations < reward.threshold,
  );
  const progressToNext = nextReward
    ? ngoRewardProgress(entry.verifiedDonations, nextReward.threshold)
    : 100;
  const initials = ngoInitials(entry.name);
  const tier = ngoTier(entry.verifiedDonations);

  return (
    <Link
      id={`ngo-${entry.id}`}
      href={`/partners/${entry.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-[1.35rem] border p-3.5 text-left shadow-[0_16px_36px_-26px_rgba(28,13,20,0.42)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_rgba(28,13,20,0.5)]",
        theme.card,
        highlighted && "ring-2 ring-offset-2 ring-ink/20",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 size-28 rounded-full blur-2xl",
          theme.glow,
        )}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1.5",
          theme.bar,
        )}
        aria-hidden
      />

      <div className="mb-2.5 flex items-center justify-between gap-2 pl-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wider",
            theme.badge,
          )}
        >
          <Shield className="size-3" aria-hidden />
          {isImpactPartner(entry) ? t("ngo.livePartner") : t("ngo.registered")}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] ring-1",
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

      <div className="flex min-w-0 items-start gap-2.5 pl-2">
        <span
          className={cn(
            "inline-flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-[0_8px_16px_-8px_rgba(28,13,20,0.45)]",
            theme.avatar,
          )}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[1.2rem] font-black leading-tight tracking-tight text-ink">
            {entry.name}
          </h2>
          <p className="mt-1 text-xs font-semibold text-ink-muted">
            {t("ngo.donationCount", { n: entry.verifiedDonations })} ·{" "}
            {t("ngo.volunteerCount", { n: entry.volunteers })}
          </p>
        </div>
      </div>

      <div className="mt-2.5 pl-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] shadow-[0_6px_16px_-8px_rgba(28,13,20,0.35)]",
            theme.badge,
          )}
        >
          <Gift className="size-3.5" aria-hidden />
          {t("ngo.rewardsShort", {
            n: unlocked,
            total: NGO_IMPACT_REWARDS.length,
          })}
        </span>
      </div>

      <div className="ml-2 mt-2.5 rounded-xl border border-white/70 bg-white/75 px-3 py-2.5 backdrop-blur-sm">
        <p className="flex items-start gap-2 text-xs font-semibold text-ink-muted">
          <MapPin className={cn("mt-0.5 size-3.5 shrink-0", theme.accent)} aria-hidden />
          <span className="line-clamp-2">{entry.address}</span>
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted">
            <HeartHandshake className="size-3.5 text-crimson" aria-hidden />
            {t("ngo.tapForDetail")}
          </span>
          {nextReward ? (
            <span className={cn("text-[0.65rem] font-black uppercase tracking-wider", theme.accent)}>
              {progressToNext}%
            </span>
          ) : (
            <span className="text-[0.65rem] font-black uppercase tracking-wider text-emerald-600">
              {t("ngo.maxTier")}
            </span>
          )}
        </div>
        {nextReward ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={cn("h-full rounded-full", theme.progress)}
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
