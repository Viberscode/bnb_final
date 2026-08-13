"use client";

import { Check, HeartHandshake, MapPin, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatCountdown, remainingMs } from "@/lib/donor-assignment";
import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { DonorAssignment } from "@/types";

export function AssignedDonorLine({
  assignment,
  youAreAssigned,
  onAccept,
  onDecline,
  showActions,
}: {
  assignment?: DonorAssignment;
  youAreAssigned?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}) {
  const { t } = useLanguage();
  const wait = remainingMs(assignment);
  const pending = assignment?.status === "pending";
  const accepted = assignment?.status === "accepted";
  const searching = !assignment || assignment.status === "searching";

  if (searching) {
    return (
      <p className="mt-2 text-xs font-semibold text-ink-muted">
        {t("match.searching")}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 rounded-xl border px-3 py-2",
        accepted
          ? "border-emerald-200 bg-emerald-50"
          : "border-teal/25 bg-teal-soft/50",
      )}
    >
      <p
        className={cn(
          "text-[0.6rem] font-black uppercase tracking-[0.14em]",
          accepted ? "text-emerald-700" : "text-teal-deep",
        )}
      >
        {accepted
          ? t("match.accepted")
          : youAreAssigned
            ? t("match.youAreAssigned")
            : t("match.assigned")}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-ink">
        <HeartHandshake className="size-3.5 text-teal-deep" aria-hidden />
        <span>
          {assignment.donorName} · {assignment.bloodGroup}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
          <MapPin className="size-3" aria-hidden />
          {formatDistance(assignment.distanceKm)}
        </span>
        <span className="text-xs font-semibold text-ink-muted">
          {t("match.donations", { n: assignment.donationsCompleted })}
        </span>
      </p>
      {pending ? (
        <p className="mt-1 text-xs font-bold text-crimson">
          {youAreAssigned
            ? t("match.respondBy", { time: formatCountdown(wait) })
            : t("match.waiting", { time: formatCountdown(wait) })}
        </p>
      ) : null}
      {showActions && youAreAssigned && pending ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal px-3 text-xs font-black uppercase tracking-wider text-white"
          >
            <Check className="size-3.5" aria-hidden />
            {t("match.accept")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecline?.();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-black uppercase tracking-wider text-ink"
          >
            <X className="size-3.5" aria-hidden />
            {t("match.decline")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
