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
  | "handshake";

export type MedalMetric = keyof DonorActivity;

export interface MedalDefinition {
  id: string;
  category: "milestone" | "honour";
  metal: MedalMetal;
  icon: MedalIcon;
  metric: MedalMetric;
  threshold: number;
}

export interface MedalProgress extends MedalDefinition {
  current: number;
  earned: boolean;
}

export const MILESTONE_MEDALS: MedalDefinition[] = [
  {
    id: "first-lifesaver",
    category: "milestone",
    metal: "bronze",
    icon: "droplet",
    metric: "verifiedDonations",
    threshold: 1,
  },
  {
    id: "guardian",
    category: "milestone",
    metal: "silver",
    icon: "shield",
    metric: "verifiedDonations",
    threshold: 3,
  },
  {
    id: "lifesaver",
    category: "milestone",
    metal: "gold",
    icon: "award",
    metric: "verifiedDonations",
    threshold: 5,
  },
  {
    id: "champion",
    category: "milestone",
    metal: "champion",
    icon: "trophy",
    metric: "verifiedDonations",
    threshold: 10,
  },
  {
    id: "legend",
    category: "milestone",
    metal: "legend",
    icon: "crown",
    metric: "verifiedDonations",
    threshold: 25,
  },
];

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
  ...MILESTONE_MEDALS,
  ...HONOUR_MEDALS,
];

export function evaluateMedals(activity: DonorActivity): MedalProgress[] {
  return ALL_MEDALS.map((medal) => {
    const current = activity[medal.metric] ?? 0;
    return {
      ...medal,
      current,
      earned: current >= medal.threshold,
    };
  });
}

export function highestMilestone(medals: MedalProgress[]): MedalProgress | null {
  const earned = medals
    .filter((medal) => medal.category === "milestone" && medal.earned)
    .sort((a, b) => b.threshold - a.threshold);
  return earned[0] ?? null;
}
