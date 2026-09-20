import type { NgoProfile } from "@/types";

/** Community supplies / infrastructure unlocked at donation milestones (per NGO). */
export const NGO_IMPACT_REWARDS = [
  {
    id: "ngo-reward-25",
    threshold: 25,
    titleKey: "ngo.reward25Title",
    bodyKey: "ngo.reward25Body",
  },
  {
    id: "ngo-reward-50",
    threshold: 50,
    titleKey: "ngo.reward50Title",
    bodyKey: "ngo.reward50Body",
  },
  {
    id: "ngo-reward-100",
    threshold: 100,
    titleKey: "ngo.reward100Title",
    bodyKey: "ngo.reward100Body",
  },
  {
    id: "ngo-reward-250",
    threshold: 250,
    titleKey: "ngo.reward250Title",
    bodyKey: "ngo.reward250Body",
  },
  {
    id: "ngo-reward-500",
    threshold: 500,
    titleKey: "ngo.reward500Title",
    bodyKey: "ngo.reward500Body",
  },
] as const;

export type NgoDirectoryEntry = {
  id: string;
  name: string;
  registrationNo: string;
  address: string;
  authorizedPerson: string;
  phone?: string;
  lat: number;
  lng: number;
  verifiedDonations: number;
  volunteers: number;
  /** Shown in directory — registered users vs demo impact partners. */
  source: "sample" | "registered";
};

const DEMO_NGO_CENTER = { lat: 30.7046, lng: 76.7179 };

export const SAMPLE_NGO_DIRECTORY: NgoDirectoryEntry[] = [
  {
    id: "sample-punjab-red-cross",
    name: "Punjab Red Cross Society",
    registrationNo: "DARPAN-PB-2018-00412",
    address: "Phase 7, Sector 61, Mohali, Punjab",
    authorizedPerson: "Dr. Harpreet Kaur",
    lat: 30.7046,
    lng: 76.7179,
    verifiedDonations: 421,
    volunteers: 112,
    source: "sample",
  },
  {
    id: "sample-hemkunt",
    name: "Hemkunt Foundation",
    registrationNo: "12A/AAH-2011-0019",
    address: "Gurugram–Delhi Expressway, Sector 37, Gurugram",
    authorizedPerson: "Gurpreet Singh",
    lat: 28.4393,
    lng: 77.047,
    verifiedDonations: 312,
    volunteers: 89,
    source: "sample",
  },
  {
    id: "sample-seva-blood",
    name: "Seva Blood Foundation",
    registrationNo: "80G/CHD/2019/8821",
    address: "Sector 22-C, Chandigarh",
    authorizedPerson: "Anita Sharma",
    lat: 30.7353,
    lng: 76.7794,
    verifiedDonations: 186,
    volunteers: 42,
    source: "sample",
  },
  {
    id: "sample-narayan-seva",
    name: "Narayan Seva Blood Camp",
    registrationNo: "PB/NGO/2017/0338",
    address: "VIP Road, Zirakpur, Punjab",
    authorizedPerson: "Ramesh Kumar",
    lat: 30.6425,
    lng: 76.8173,
    verifiedDonations: 128,
    volunteers: 34,
    source: "sample",
  },
  {
    id: "sample-rotary-ludhiana",
    name: "Rotary Blood Bank Ludhiana",
    registrationNo: "ROT/PB/LDH/2015",
    address: "Model Town, Ludhiana, Punjab",
    authorizedPerson: "Col. (Retd.) J.S. Gill",
    lat: 30.8841,
    lng: 75.8573,
    verifiedDonations: 94,
    volunteers: 24,
    source: "sample",
  },
  {
    id: "sample-lifeline-amritsar",
    name: "LifeLine NGO Amritsar",
    registrationNo: "ASR/NGO/2020/1190",
    address: "Lawrence Road, Amritsar, Punjab",
    authorizedPerson: "Simranjeet Kaur",
    lat: 31.634,
    lng: 74.8723,
    verifiedDonations: 73,
    volunteers: 19,
    source: "sample",
  },
  {
    id: "sample-jan-hit",
    name: "Jan Hit Blood Seva",
    registrationNo: "HR/NGO/2018/0455",
    address: "Sector 5, Panchkula, Haryana",
    authorizedPerson: "Vikram Malhotra",
    lat: 30.6956,
    lng: 76.8606,
    verifiedDonations: 58,
    volunteers: 16,
    source: "sample",
  },
  {
    id: "sample-raktdaan-bathinda",
    name: "Raktdaan Mitra Trust",
    registrationNo: "PB/NGO/2016/0772",
    address: "Model Town, Bathinda, Punjab",
    authorizedPerson: "Baljit Singh",
    lat: 30.211,
    lng: 74.9455,
    verifiedDonations: 41,
    volunteers: 11,
    source: "sample",
  },
];

export function registeredNgoToDirectory(ngo: NgoProfile): NgoDirectoryEntry {
  return {
    id: ngo.id,
    name: ngo.name,
    registrationNo: ngo.registrationNo,
    address: ngo.address,
    authorizedPerson: ngo.authorizedPerson,
    phone: ngo.phone || undefined,
    lat: DEMO_NGO_CENTER.lat,
    lng: DEMO_NGO_CENTER.lng,
    verifiedDonations: 0,
    volunteers: 0,
    source: "registered",
  };
}

export function mergeNgoDirectory(registered: NgoProfile[]): NgoDirectoryEntry[] {
  const seen = new Set<string>();
  const out: NgoDirectoryEntry[] = [];

  for (const sample of SAMPLE_NGO_DIRECTORY) {
    seen.add(sample.name.toLowerCase());
    out.push(sample);
  }

  for (const ngo of registered) {
    if (seen.has(ngo.name.toLowerCase())) continue;
    out.push(registeredNgoToDirectory(ngo));
  }

  return out.sort((a, b) => {
    if (a.source !== b.source) return a.source === "sample" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function ngoRewardProgress(donations: number, threshold: number) {
  return Math.min(100, Math.round((donations / threshold) * 100));
}

export type NgoTheme = {
  id: string;
  card: string;
  bar: string;
  avatar: string;
  badge: string;
  pill: string;
  progress: string;
  glow: string;
  accent: string;
  pin: string;
};

const NGO_THEMES: NgoTheme[] = [
  {
    id: "crimson",
    card: "border-[#ffb3bf] bg-gradient-to-br from-white via-[#fff5f7] to-[#ffe4ea]",
    bar: "bg-[#c4122f]",
    avatar: "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
    badge: "bg-[#c4122f] text-white",
    pill: "bg-[#fff0f3] text-[#9f1239] ring-[#ffc1cc]",
    progress: "bg-gradient-to-r from-[#ff4d6d] to-[#c4122f]",
    glow: "bg-[#ff4d6d]/20",
    accent: "text-[#c4122f]",
    pin: "#c4122f",
  },
  {
    id: "sky",
    card: "border-sky-200 bg-gradient-to-br from-white via-sky-50 to-blue-50",
    bar: "bg-sky-600",
    avatar: "bg-gradient-to-br from-sky-400 to-blue-800",
    badge: "bg-sky-600 text-white",
    pill: "bg-sky-50 text-sky-800 ring-sky-200",
    progress: "bg-gradient-to-r from-sky-400 to-blue-700",
    glow: "bg-sky-400/20",
    accent: "text-sky-700",
    pin: "#0284c7",
  },
  {
    id: "teal",
    card: "border-teal-200 bg-gradient-to-br from-white via-teal-50/80 to-emerald-50",
    bar: "bg-teal",
    avatar: "bg-gradient-to-br from-teal-400 to-teal-deep",
    badge: "bg-teal text-white",
    pill: "bg-teal-50 text-teal-deep ring-teal-200",
    progress: "bg-gradient-to-r from-teal-400 to-teal-deep",
    glow: "bg-teal/20",
    accent: "text-teal-deep",
    pin: "#0d7370",
  },
  {
    id: "amber",
    card: "border-amber-200 bg-gradient-to-br from-white via-[#fffaf0] to-amber-50",
    bar: "bg-amber-500",
    avatar: "bg-gradient-to-br from-amber-400 to-orange-700",
    badge: "bg-amber-500 text-white",
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
    progress: "bg-gradient-to-r from-amber-400 to-orange-600",
    glow: "bg-amber-400/25",
    accent: "text-amber-700",
    pin: "#d97706",
  },
  {
    id: "violet",
    card: "border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50",
    bar: "bg-violet-600",
    avatar: "bg-gradient-to-br from-violet-400 to-purple-800",
    badge: "bg-violet-600 text-white",
    pill: "bg-violet-50 text-violet-800 ring-violet-200",
    progress: "bg-gradient-to-r from-violet-400 to-purple-700",
    glow: "bg-violet-400/20",
    accent: "text-violet-700",
    pin: "#7c3aed",
  },
  {
    id: "indigo",
    card: "border-indigo-200 bg-gradient-to-br from-white via-indigo-50 to-slate-50",
    bar: "bg-indigo-600",
    avatar: "bg-gradient-to-br from-indigo-400 to-indigo-900",
    badge: "bg-indigo-600 text-white",
    pill: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    progress: "bg-gradient-to-r from-indigo-400 to-indigo-700",
    glow: "bg-indigo-400/20",
    accent: "text-indigo-700",
    pin: "#4f46e5",
  },
  {
    id: "rose",
    card: "border-rose-200 bg-gradient-to-br from-white via-rose-50 to-pink-50",
    bar: "bg-rose-500",
    avatar: "bg-gradient-to-br from-rose-400 to-rose-800",
    badge: "bg-rose-500 text-white",
    pill: "bg-rose-50 text-rose-800 ring-rose-200",
    progress: "bg-gradient-to-r from-rose-400 to-rose-600",
    glow: "bg-rose-400/20",
    accent: "text-rose-700",
    pin: "#e11d48",
  },
  {
    id: "lime",
    card: "border-lime-200 bg-gradient-to-br from-white via-lime-50 to-emerald-50",
    bar: "bg-lime-600",
    avatar: "bg-gradient-to-br from-lime-400 to-emerald-700",
    badge: "bg-lime-600 text-white",
    pill: "bg-lime-50 text-lime-800 ring-lime-200",
    progress: "bg-gradient-to-r from-lime-400 to-emerald-600",
    glow: "bg-lime-400/25",
    accent: "text-lime-700",
    pin: "#65a30d",
  },
];

function hashId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function themeForNgo(id: string): NgoTheme {
  const sampleIndex = SAMPLE_NGO_DIRECTORY.findIndex((item) => item.id === id);
  const index = sampleIndex >= 0 ? sampleIndex : hashId(id) % NGO_THEMES.length;
  return NGO_THEMES[index] ?? NGO_THEMES[0];
}

export function ngoInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function ngoTier(donations: number) {
  if (donations >= 250) return "leader" as const;
  if (donations >= 100) return "active" as const;
  if (donations >= 25) return "growing" as const;
  return "new" as const;
}

/** Highest-impact orgs: top partners and those already running camps. */
export function isImpactPartner(entry: Pick<NgoDirectoryEntry, "verifiedDonations">) {
  const tier = ngoTier(entry.verifiedDonations);
  return tier === "leader" || tier === "active";
}
