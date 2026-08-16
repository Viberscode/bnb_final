"use client";

import { Check, Clock3, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { canShareContactDetails } from "@/lib/donor-assignment";
import { cn } from "@/lib/utils";
import type { BloodRequest } from "@/types";

export function RequesterConfirmPanel({
  request,
  confirming,
  waiting,
  onAccepted,
  onWaitMore,
}: {
  request: BloodRequest;
  confirming?: boolean;
  waiting?: boolean;
  onAccepted?: () => void;
  onWaitMore?: () => void;
}) {
  const { t } = useLanguage();
  const busy = Boolean(confirming || waiting);

  if (
    request.status === "completed" ||
    !canShareContactDetails(request.assignment) ||
    !onAccepted
  ) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-3.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-800">
        {t("request.statusTitle")}
      </p>
      <h3 className="mt-1 font-display text-lg font-extrabold tracking-tight text-ink">
        {t("request.statusHeading")}
      </h3>
      <p className="mt-1 text-sm font-semibold text-ink-muted">
        {t("request.statusBody")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onAccepted}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_12px_24px_-14px_rgba(5,150,105,0.8)] hover:bg-emerald-700 disabled:opacity-70",
          )}
        >
          {confirming ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          {t("request.statusAccepted")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onWaitMore}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#c4122f] px-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_12px_24px_-14px_rgba(196,18,47,0.75)] hover:bg-[#9f1239] disabled:opacity-70"
        >
          {waiting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Clock3 className="size-4" aria-hidden />
          )}
          {t("request.statusWaitMore")}
        </button>
      </div>
    </div>
  );
}
