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

/** ABO with Rh raised like clinical notation (A⁺, O⁻). */
export function BloodGroupText({
  group,
  className,
}: {
  group: string;
  className?: string;
}) {
  const rh = group.endsWith("+") || group.endsWith("-") ? group.slice(-1) : "";
  const abo = rh ? group.slice(0, -1) : group;
  return (
    <span className={cn("inline-flex items-start font-[inherit]", className)}>
      <span className="leading-none">{abo}</span>
      {rh ? (
        <sup className="relative top-[-0.32em] ml-[0.04em] text-[0.55em] font-extrabold leading-none">
          {rh}
        </sup>
      ) : null}
    </span>
  );
}

export function BloodGroupList({
  groups,
  className,
}: {
  groups: string[];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1", className)}>
      {groups.map((group, index) => (
        <span key={`${group}-${index}`} className="inline-flex items-center gap-1">
          <BloodGroupText group={group} />
          {index < groups.length - 1 ? <span aria-hidden>·</span> : null}
        </span>
      ))}
    </span>
  );
}

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
              ? "size-11 rounded-xl text-base sm:size-12 sm:rounded-2xl sm:text-lg"
              : "size-9 rounded-xl text-sm",
          )}
        >
          <BloodGroupText group={group} />
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
        <span key={item.group} className="inline-flex items-baseline gap-1">
          <BloodGroupText group={item.group} />
          <span>
            {item.units}{" "}
            {item.units > 1 ? t("live.units") : t("live.unit")}
            {index === breakdown.length - 1 ? ` ${t("live.needed")}` : ""}
          </span>
        </span>
      ))}
    </span>
  );
}
