import type { BloodGroup } from "@/types";

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
