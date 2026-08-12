"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  neededBloodGroups,
  totalUnits,
  unitsByGroup,
} from "@/lib/blood-compatibility";
import type { BloodGroup, BloodRequest, UrgencyLevel } from "@/types";

const URGENCY_BG: Record<UrgencyLevel, string> = {
  critical: "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
  urgent: "bg-gradient-to-br from-amber-400 to-orange-600",
  planned: "bg-gradient-to-br from-teal to-teal-deep",
};

export function BloodGroupMark({
  request,
  groups,
  urgency = "critical",
  size = "lg",
}: {
  request?: Pick<BloodRequest, "bloodGroup" | "bloodGroups" | "urgency">;
  groups?: BloodGroup[];
  urgency?: UrgencyLevel;
  size?: "sm" | "lg";
}) {
  const list = groups?.length
    ? groups
    : request
      ? neededBloodGroups(request)
      : [];
  const tone = request?.urgency ?? urgency;
  if (list.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.map((group) => (
        <span
          key={group}
          className={cn(
            "inline-flex shrink-0 items-center justify-center font-display font-extrabold leading-none text-white",
            URGENCY_BG[tone],
            size === "lg"
              ? "size-12 rounded-2xl text-lg"
              : "size-10 rounded-xl text-sm",
          )}
        >
          {group}
        </span>
      ))}
    </div>
  );
}

export function UnitsNeededLine({
  request,
}: {
  request: Pick<
    BloodRequest,
    "bloodGroup" | "bloodGroups" | "units" | "groupUnits"
  >;
}) {
  const { t } = useLanguage();
  const breakdown = unitsByGroup(request);
  const total = totalUnits(request);

  if (breakdown.length <= 1) {
    return (
      <>
        {total} {total > 1 ? t("live.units") : t("live.unit")} {t("live.needed")}
      </>
    );
  }

  return (
    <span className="flex flex-col gap-0.5 font-display text-lg font-extrabold leading-tight tracking-tight tabular-nums">
      {breakdown.map((item, index) => (
        <span key={item.group}>
          {item.group} {item.units}{" "}
          {item.units > 1 ? t("live.units") : t("live.unit")}
          {index === breakdown.length - 1 ? ` ${t("live.needed")}` : ""}
        </span>
      ))}
    </span>
  );
}
