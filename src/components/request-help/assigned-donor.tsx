import { HeartHandshake, MapPin } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatDistance } from "@/lib/geo";
import type { DonorAssignment } from "@/types";

export function AssignedDonorLine({
  assignment,
  youAreAssigned,
}: {
  assignment?: DonorAssignment;
  youAreAssigned?: boolean;
}) {
  const { t } = useLanguage();

  if (!assignment) {
    return (
      <p className="mt-2 text-xs font-semibold text-ink-muted">
        {t("match.searching")}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-teal/25 bg-teal-soft/50 px-3 py-2">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-teal-deep">
        {youAreAssigned ? t("match.youAreAssigned") : t("match.assigned")}
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
    </div>
  );
}
