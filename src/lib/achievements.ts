import type { DonorActivity } from "@/lib/donor-activity";

export type MedalMetal =
  | "bronze"
  | "silver"
  | "gold"
  | "champion"
  | "legend"
  | "ruby"
  | "steel"
  | "heart"
  | "teal";

export type MedalIcon =
  | "droplet"
  | "shield"
  | "award"
  | "trophy"
  | "crown"
  | "siren"
  | "zap"
  | "heart"
  | "handshake"
  | "gift"
  | "stethoscope"
  | "luggage"
  | "percent";

export type MedalMetric = keyof DonorActivity;

export interface MedalDefinition {
  id: string;
  category: "reward" | "honour";
  metal: MedalMetal;
  icon: MedalIcon;
  metric: MedalMetric;
  threshold: number;
}

export interface MedalProgress extends MedalDefinition {
  current: number;
  earned: boolean;
}

/** Partner perks unlocked every 5 verified donations. */
export const DONATION_REWARDS: MedalDefinition[] = [
  {
    id: "reward-5",
    category: "reward",
    metal: "bronze",
    icon: "percent",
    metric: "verifiedDonations",
    threshold: 5,
  },
  {
    id: "reward-10",
    category: "reward",
    metal: "silver",
    icon: "stethoscope",
    metric: "verifiedDonations",
    threshold: 10,
  },
  {
    id: "reward-15",
    category: "reward",
    metal: "gold",
    icon: "luggage",
    metric: "verifiedDonations",
    threshold: 15,
  },
  {
    id: "reward-20",
    category: "reward",
    metal: "champion",
    icon: "gift",
    metric: "verifiedDonations",
    threshold: 20,
  },
  {
    id: "reward-25",
    category: "reward",
    metal: "legend",
    icon: "trophy",
    metric: "verifiedDonations",
    threshold: 25,
  },
];

/** @deprecated use DONATION_REWARDS */
export const MILESTONE_MEDALS = DONATION_REWARDS;

export const HONOUR_MEDALS: MedalDefinition[] = [
  {
    id: "critical-responder",
    category: "honour",
    metal: "ruby",
    icon: "siren",
    metric: "criticalCompleted",
    threshold: 1,
  },
  {
    id: "rapid-responder",
    category: "honour",
    metal: "steel",
    icon: "zap",
    metric: "rapidCompleted",
    threshold: 1,
  },
  {
    id: "true-lifesaver",
    category: "honour",
    metal: "heart",
    icon: "heart",
    metric: "emergencyCompleted",
    threshold: 2,
  },
  {
    id: "community-hero",
    category: "honour",
    metal: "teal",
    icon: "handshake",
    metric: "maxInOneCity",
    threshold: 3,
  },
];

export const ALL_MEDALS: MedalDefinition[] = [
  ...DONATION_REWARDS,
  ...HONOUR_MEDALS,
];

export function evaluateMedals(activity: DonorActivity): MedalProgress[] {
  return ALL_MEDALS.map((medal) => {
    const raw = activity[medal.metric];
    const current = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    return {
      ...medal,
      current,
      earned: current >= medal.threshold,
    };
  });
}

export function highestMilestone(medals: MedalProgress[]): MedalProgress | null {
  const earned = medals
    .filter((medal) => medal.category === "reward" && medal.earned)
    .sort((a, b) => b.threshold - a.threshold);
  return earned[0] ?? null;
}

export function nextDonorReward(medals: MedalProgress[]): MedalProgress | null {
  return (
    medals
      .filter((medal) => medal.category === "reward" && !medal.earned)
      .sort((a, b) => a.threshold - b.threshold)[0] ?? null
  );
}
