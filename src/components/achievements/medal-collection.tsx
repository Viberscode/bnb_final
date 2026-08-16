"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { MedalBadge } from "@/components/achievements/medal-badge";
import { MedalCard } from "@/components/achievements/medal-card";
import { MEDAL_COPY, MedalDetailModal } from "@/components/achievements/medal-detail-modal";
import {
  evaluateMedals,
  highestMilestone,
  type MedalProgress,
} from "@/lib/achievements";
import type { DonorActivity } from "@/lib/donor-activity";

export function MedalCollection({ activity }: { activity: DonorActivity }) {
  const { t } = useLanguage();
  const medals = useMemo(() => evaluateMedals(activity), [activity]);
  const [open, setOpen] = useState<MedalProgress | null>(null);
  const highest = highestMilestone(medals);
  const earnedCount = medals.filter((medal) => medal.earned).length;
  const milestones = medals.filter((medal) => medal.category === "milestone");
  const honours = medals.filter((medal) => medal.category === "honour");

  return (
    <section className="space-y-4">
      <div className="request-step-panel overflow-hidden p-5 sm:p-6" data-tone="crimson">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {highest ? (
              <MedalBadge
                metal={highest.metal}
                icon={highest.icon}
                earned
                size="lg"
              />
            ) : (
              <MedalBadge metal="silver" icon="shield" earned={false} size="lg" />
            )}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
                {t("medals.highest")}
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">
                {highest ? t(MEDAL_COPY[highest.id].name) : t("medals.noneYet")}
              </h2>
              <p className="mt-1 text-sm font-semibold text-ink-muted">
                {t("medals.verifiedCount", { n: activity.verifiedDonations })}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-left sm:text-right">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
              {t("medals.verifiedDonations")}
            </p>
            <p className="mt-1 font-display text-3xl font-black text-crimson">
              {activity.verifiedDonations}
            </p>
          </div>
        </div>
      </div>

      <div className="request-step-panel p-5 sm:p-6" data-tone="amber">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-crimson">
              <Sparkles className="size-3.5" aria-hidden />
              {t("medals.collection")}
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
              {t("medals.collectionTitle")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ink-muted">
              {t("medals.collectionBody")}
            </p>
          </div>
          <span className="rounded-full border border-crimson/20 bg-crimson-soft px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-crimson">
            {t("medals.earnedCount", { n: earnedCount, total: medals.length })}
          </span>
        </div>

        <p className="mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
          {t("medals.milestones")}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {milestones.map((medal) => (
            <MedalCard
              key={medal.id}
              medal={medal}
              onOpen={() => setOpen(medal)}
            />
          ))}
        </div>

        <p className="mt-6 text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
          {t("medals.honours")}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {honours.map((medal) => (
            <MedalCard
              key={medal.id}
              medal={medal}
              onOpen={() => setOpen(medal)}
            />
          ))}
        </div>
      </div>

      {open ? (
        <MedalDetailModal medal={open} onClose={() => setOpen(null)} />
      ) : null}
    </section>
  );
}
