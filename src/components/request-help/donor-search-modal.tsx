"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2, Radio, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  canViewAssignedDonor,
  canShareContactDetails,
  formatCountdown,
  remainingMs,
} from "@/lib/donor-assignment";
import { cn } from "@/lib/utils";
import { WhatsAppConnectButton } from "@/components/request-help/whatsapp-connect-button";
import type { BloodRequest } from "@/types";

export function DonorSearchModal({
  request,
  onClose,
  onViewDonor,
}: {
  request: BloodRequest;
  onClose: () => void;
  onViewDonor?: () => void;
}) {
  const { t } = useLanguage();
  const assignment = request.assignment;
  const wait = remainingMs(assignment);
  const canView = Boolean(onViewDonor) && canViewAssignedDonor(request, assignment);
  const searching =
    !assignment || assignment.status === "searching" || !assignment.donorId;
  const pending = assignment?.status === "pending" && Boolean(assignment.donorId);
  const accepted = assignment?.status === "accepted";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/70 backdrop-blur-[3px]"
        aria-label={t("match.closeSearch")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-search-title"
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/40 bg-white p-6 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
          aria-label={t("match.closeSearch")}
        >
          <X className="size-4" aria-hidden />
        </button>

        <p className="text-xs font-black uppercase tracking-[0.18em] text-crimson">
          {t("match.liveMatch")}
        </p>
        <h2
          id="donor-search-title"
          className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink"
        >
          {accepted
            ? t("match.searchFound")
            : pending
              ? t("match.searchWaiting")
              : t("match.searchTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {accepted
            ? t("match.searchFoundBody")
            : pending
              ? t("match.searchWaitingBody")
              : t("match.searchBody")}
        </p>

        <div className="relative mx-auto mt-8 flex size-36 items-center justify-center">
          <span
            className={cn(
              "absolute inset-0 rounded-full border-2",
              accepted
                ? "border-emerald-300"
                : "animate-ping border-crimson/30",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "absolute inset-3 rounded-full border-2",
              accepted ? "border-emerald-200" : "animate-pulse border-crimson/40",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "relative inline-flex size-16 items-center justify-center rounded-2xl text-white shadow-lg",
              accepted
                ? "bg-gradient-to-br from-emerald-400 to-teal-deep"
                : "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
            )}
          >
            {accepted ? (
              <CheckCircle2 className="size-8" aria-hidden />
            ) : (
              <Radio className="size-8 animate-pulse" aria-hidden />
            )}
          </span>
        </div>

        <div className="mt-8 space-y-2">
          <StatusRow
            done={!searching}
            active={searching}
            label={t("match.stepScan")}
          />
          <StatusRow
            done={pending || accepted}
            active={pending}
            label={t("match.stepAssign")}
          />
          <StatusRow
            done={accepted}
            active={false}
            label={t("match.stepConfirm")}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-paper/70 px-4 py-3 text-center">
          {accepted && canView ? (
            <button
              type="button"
              onClick={onViewDonor}
              className="font-display text-xl font-extrabold text-teal-deep underline-offset-2 hover:underline"
            >
              {t("match.searchDone")}
            </button>
          ) : accepted ? (
            <p className="font-display text-xl font-extrabold text-teal-deep">
              {t("match.searchDone")}
            </p>
          ) : (
            <>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
                {pending ? t("match.donorTimer") : t("match.searchTimer")}
              </p>
              <p className="mt-1 font-display text-4xl font-black tracking-tight text-crimson">
                {pending
                  ? formatCountdown(wait)
                  : formatCountdown(
                      Date.now() - new Date(request.createdAt).getTime(),
                    )}
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-muted">
                {t("match.priority")}
              </p>
              {pending && canView ? (
                <button
                  type="button"
                  onClick={onViewDonor}
                  className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-teal-deep hover:underline"
                >
                  {t("match.viewDonor")}
                </button>
              ) : null}
            </>
          )}
        </div>

        {canShareContactDetails(assignment) ? (
          <WhatsAppConnectButton requestId={request.id} className="mt-3" />
        ) : null}

        {!accepted ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-ink-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {t("match.realtime")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatusRow({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-white px-3 py-2.5">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-[0.65rem] font-black",
          done
            ? "bg-teal text-white"
            : active
              ? "bg-crimson text-white"
              : "bg-slate-100 text-ink-muted",
        )}
      >
        {done ? "✓" : active ? "…" : ""}
      </span>
      <p
        className={cn(
          "text-sm font-bold",
          done || active ? "text-ink" : "text-ink-muted",
        )}
      >
        {label}
      </p>
    </div>
  );
}
