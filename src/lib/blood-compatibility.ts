import type { BloodGroup, BloodRequest } from "@/types";

/** Display order — universal donors first, universal recipients last. */
export const BLOOD_GROUPS: BloodGroup[] = [
  "O-",
  "O+",
  "B-",
  "B+",
  "A-",
  "A+",
  "AB-",
  "AB+",
];

/**
 * Who a donor of `group` can give blood to (ABO/Rh donation matrix).
 * Keys = donor blood group, values = compatible recipient groups.
 */
const DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export function canDonateTo(group: BloodGroup): BloodGroup[] {
  return DONATE_TO[group];
}

export function neededBloodGroups(
  request: Pick<BloodRequest, "bloodGroup" | "bloodGroups">,
): BloodGroup[] {
  const list = request.bloodGroups?.length
    ? request.bloodGroups
    : [request.bloodGroup];
  return [...new Set(list)];
}

export function unitsByGroup(
  request: Pick<BloodRequest, "bloodGroup" | "bloodGroups" | "units" | "groupUnits">,
): { group: BloodGroup; units: number }[] {
  const groups = neededBloodGroups(request);
  return groups.map((group) => ({
    group,
    units: Math.max(1, request.groupUnits?.[group] ?? (groups.length === 1 ? request.units : 1)),
  }));
}

export function totalUnits(
  request: Pick<BloodRequest, "bloodGroup" | "bloodGroups" | "units" | "groupUnits">,
): number {
  const breakdown = unitsByGroup(request);
  if (breakdown.length <= 1) return request.units;
  return breakdown.reduce((sum, item) => sum + item.units, 0);
}

export function formatUnitsBreakdown(
  request: Pick<BloodRequest, "bloodGroup" | "bloodGroups" | "units" | "groupUnits">,
): string {
  const breakdown = unitsByGroup(request);
  if (breakdown.length <= 1) {
    const units = breakdown[0]?.units ?? request.units;
    return `${units} unit${units > 1 ? "s" : ""}`;
  }
  return breakdown
    .map((item) => `${item.group} ${item.units} unit${item.units > 1 ? "s" : ""}`)
    .join(" · ");
}

export function donorMatchesRequest(
  donorGroup: BloodGroup,
  request: Pick<BloodRequest, "bloodGroup" | "bloodGroups">,
): boolean {
  const canHelp = new Set(canDonateTo(donorGroup));
  return neededBloodGroups(request).some((group) => canHelp.has(group));
}

export function canReceiveFrom(group: BloodGroup): BloodGroup[] {
  return BLOOD_GROUPS.filter((donor) => DONATE_TO[donor].includes(group));
}

export function compatibilitySummary(group: BloodGroup) {
  const donateTo = canDonateTo(group);
  const receiveFrom = canReceiveFrom(group);

  let tip = "";
  if (group === "O-") {
    tip = "O− is the universal donor — your blood can help every group.";
  } else if (group === "AB+") {
    tip = "AB+ is the universal recipient — you can receive from every group.";
  } else if (donateTo.length >= 4) {
    tip = `${group} can help several groups. You’re especially valuable in emergencies.`;
  } else {
    tip = `${group} has a focused match set — nearby donors still make a big difference.`;
  }

  return { donateTo, receiveFrom, tip };
}
