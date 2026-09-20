"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { mergeNgoDirectory, themeForNgo } from "@/lib/ngo-showcase";
import type { NgoProfile } from "@/types";
import { cn } from "@/lib/utils";

export function NgoDirectoryModal({
  ngos,
  onClose,
}: {
  ngos: NgoProfile[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const entries = useMemo(() => mergeNgoDirectory(ngos), [ngos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/70 backdrop-blur-[2px]"
        aria-label={t("ngo.closeList")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ngo-directory-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/40 bg-white shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2
              id="ngo-directory-title"
              className="font-display text-2xl font-extrabold tracking-tight text-ink"
            >
              {t("ngo.directoryTitle")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ink-muted">
              {t("ngo.directoryBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
            aria-label={t("ngo.closeList")}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-5">
          <ul className="space-y-2">
            {entries.slice(0, 5).map((ngo) => {
              const theme = themeForNgo(ngo.id);
              return (
                <li key={ngo.id}>
                  <Link
                    href={`/partners/${ngo.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left",
                      theme.card,
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-black text-ink">
                        {ngo.name}
                      </span>
                      <span className="text-xs font-bold text-ink-muted">
                        {t("ngo.donationCount", { n: ngo.verifiedDonations })}
                      </span>
                    </span>
                    <ChevronRight className={cn("size-4", theme.accent)} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/partners"
            onClick={onClose}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 text-sm font-black uppercase tracking-[0.08em] text-white"
          >
            {t("ngo.openFullDirectory")}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
