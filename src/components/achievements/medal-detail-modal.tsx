"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage, type MessagePath } from "@/components/i18n/language-provider";
import { MedalBadge } from "@/components/achievements/medal-badge";
import type { MedalProgress } from "@/lib/achievements";

export const MEDAL_COPY: Record<string, { name: MessagePath; req: MessagePath }> = {
  "first-lifesaver": { name: "medals.firstLifesaver", req: "medals.firstLifesaverReq" },
  guardian: { name: "medals.guardian", req: "medals.guardianReq" },
  lifesaver: { name: "medals.lifesaver", req: "medals.lifesaverReq" },
  champion: { name: "medals.champion", req: "medals.championReq" },
  legend: { name: "medals.legend", req: "medals.legendReq" },
  "critical-responder": {
    name: "medals.criticalResponder",
    req: "medals.criticalResponderReq",
  },
  "rapid-responder": { name: "medals.rapidResponder", req: "medals.rapidResponderReq" },
  "true-lifesaver": { name: "medals.trueLifesaver", req: "medals.trueLifesaverReq" },
  "community-hero": { name: "medals.communityHero", req: "medals.communityHeroReq" },
};

export function MedalDetailModal({
  medal,
  onClose,
}: {
  medal: MedalProgress;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const copy = MEDAL_COPY[medal.id];
  const ratio = Math.min(1, medal.current / medal.threshold);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!copy) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/60 backdrop-blur-[2px]"
        aria-label={t("medals.close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="medal-detail-title"
        className="relative w-full max-w-sm rounded-[1.75rem] border border-white/50 bg-white p-6 text-center shadow-[0_30px_80px_-24px_rgba(28,13,20,0.5)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
          aria-label={t("medals.close")}
        >
          <X className="size-4" aria-hidden />
        </button>
        <MedalBadge
          metal={medal.metal}
          icon={medal.icon}
          earned={medal.earned}
          size="lg"
        />
        <h2
          id="medal-detail-title"
          className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink"
        >
          {t(copy.name)}
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink-muted">{t(copy.req)}</p>
        <div className="mt-4 rounded-2xl border border-line bg-paper/70 px-4 py-3">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
            {t("medals.progress")}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#c4122f] transition-[width] duration-500"
              style={{ width: `${medal.earned ? 100 : Math.max(6, ratio * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-ink">
            {Math.min(medal.current, medal.threshold)}/{medal.threshold}
          </p>
        </div>
        <p className="mt-3 text-xs font-semibold text-ink-muted">
          {medal.earned ? t("medals.earnedHint") : t("medals.lockedHint")}
        </p>
      </div>
    </div>
  );
}
