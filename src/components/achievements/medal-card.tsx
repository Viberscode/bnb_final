"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { MedalBadge } from "@/components/achievements/medal-badge";
import { MEDAL_COPY } from "@/components/achievements/medal-detail-modal";
import { cn } from "@/lib/utils";
import type { MedalProgress } from "@/lib/achievements";

export function MedalCard({
  medal,
  onOpen,
}: {
  medal: MedalProgress;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  const copy = MEDAL_COPY[medal.id];
  const ratio = Math.min(1, medal.current / medal.threshold);
  if (!copy) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full flex-col items-center rounded-2xl border bg-white/90 p-4 text-center transition duration-300 hover:-translate-y-1",
        medal.earned
          ? "border-emerald-200 shadow-[0_16px_32px_-22px_rgba(5,150,105,0.55)] hover:border-emerald-300"
          : "border-line hover:border-crimson/25",
      )}
    >
      <MedalBadge metal={medal.metal} icon={medal.icon} earned={medal.earned} />
      <h3 className="mt-3 font-display text-base font-extrabold tracking-tight text-ink">
        {t(copy.name)}
      </h3>
      <p className="mt-1 text-xs font-semibold text-ink-muted">
        {t(copy.req)}
      </p>
      {medal.earned ? (
        <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
          {t("medals.earned")}
        </span>
      ) : medal.current > 0 ? (
        <div className="mt-3 w-full">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#c4122f] transition-[width] duration-500"
              style={{ width: `${Math.max(8, ratio * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[0.65rem] font-bold text-ink-muted">
            {medal.current}/{medal.threshold} {t("medals.donations")}
          </p>
        </div>
      ) : (
        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-500">
          {t("medals.locked")}
        </span>
      )}
    </button>
  );
}
