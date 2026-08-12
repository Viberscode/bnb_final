import type {
  BloodRequest,
  Hospital,
  NetworkStats,
  UrgencyOption,
} from "@/types";

/** Clearly labeled demo/seed data until live integrations are wired. */
export const DEMO_NETWORK_STATS: NetworkStats = {
  donorsOnStandby: 1284,
  requestsFulfilledThisMonth: 347,
  avgResponseMinutes: 11,
  activeCriticalRequests: 6,
  partnerOrgs: 42,
  isDemo: true,
};

export const URGENCY_OPTIONS: UrgencyOption[] = [
  {
    value: "critical",
    label: "Critical",
    detail: "Need blood as soon as possible",
    window: "Less than 30 min",
  },
  {
    value: "urgent",
    label: "Urgent",
    detail: "Needed for upcoming transfusion",
    window: "Within 2 hours",
  },
  {
    value: "planned",
    label: "Planned",
    detail: "Surgery or scheduled requirement",
    window: "Within 24 hours",
  },
];

/** Demo hospitals — Delhi NCR. Distances computed from user geolocation when available. */
export const DEMO_HOSPITALS: Hospital[] = [
  {
    id: "h1",
    name: "AIIMS Trauma Centre",
    area: "Ansari Nagar",
    city: "New Delhi",
    lat: 28.5672,
    lng: 77.21,
  },
  {
    id: "h2",
    name: "Apollo Hospitals",
    area: "Sarita Vihar",
    city: "New Delhi",
    lat: 28.5314,
    lng: 77.2911,
  },
  {
    id: "h3",
    name: "Max Super Speciality",
    area: "Saket",
    city: "New Delhi",
    lat: 28.5274,
    lng: 77.214,
  },
  {
    id: "h4",
    name: "Fortis Escorts Heart Institute",
    area: "Okhla Road",
    city: "New Delhi",
    lat: 28.5616,
    lng: 77.283,
  },
  {
    id: "h5",
    name: "Sir Ganga Ram Hospital",
    area: "Rajinder Nagar",
    city: "New Delhi",
    lat: 28.6385,
    lng: 77.189,
  },
  {
    id: "h6",
    name: "Medanta — The Medicity",
    area: "Sector 38",
    city: "Gurugram",
    lat: 28.4397,
    lng: 77.0405,
  },
  {
    id: "h7",
    name: "BLK-Max Super Speciality",
    area: "Pusa Road",
    city: "New Delhi",
    lat: 28.6431,
    lng: 77.1868,
  },
  {
    id: "h8",
    name: "Safdarjung Hospital",
    area: "Ansari Nagar West",
    city: "New Delhi",
    lat: 28.5678,
    lng: 77.206,
  },
];

/** Seed live requests so the feed isn't empty before first submission. */
export const DEMO_LIVE_REQUESTS: BloodRequest[] = [
  {
    id: "demo-r1",
    bloodGroup: "O-",
    urgency: "critical",
    hospitalId: "h1",
    hospitalName: "AIIMS Trauma Centre",
    hospitalArea: "Ansari Nagar, New Delhi",
    contactName: "Priya S.",
    phone: "",
    units: 2,
    status: "matching",
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    distanceKm: 2.4,
    isDemo: true,
  },
  {
    id: "demo-r2",
    bloodGroup: "B+",
    urgency: "urgent",
    hospitalId: "h3",
    hospitalName: "Max Super Speciality",
    hospitalArea: "Saket, New Delhi",
    contactName: "Rahul M.",
    phone: "",
    units: 1,
    status: "pending",
    createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    distanceKm: 5.1,
    isDemo: true,
  },
  {
    id: "demo-r3",
    bloodGroup: "A+",
    urgency: "planned",
    hospitalId: "h6",
    hospitalName: "Medanta — The Medicity",
    hospitalArea: "Sector 38, Gurugram",
    contactName: "NGO Desk",
    phone: "",
    units: 3,
    status: "pending",
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    distanceKm: 18.2,
    isDemo: true,
  },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Raise",
    description:
      "Blood group, urgency, hospital pin — under a minute. SOS if every second counts.",
  },
  {
    step: "02",
    title: "Match",
    description:
      "Nearby compatible donors scored by distance, trust, and live availability — top matches alerted together.",
  },
  {
    step: "03",
    title: "Arrive",
    description:
      "First acceptor locks in. Track them live. Partner NGOs step in if the clock runs out.",
  },
] as const;

export const ROLE_PATHS = [
  {
    role: "donor" as const,
    title: "Become a Donor",
    description:
      "Toggle availability, get nearby alerts, and build a trust score that saves lives.",
    href: "/become-donor",
    cta: "Join as donor",
  },
  {
    role: "patient" as const,
    title: "Request Help",
    description:
      "Submit a blood need with urgency and location. Watch matching happen in real time.",
    href: "/request-help",
    cta: "Request blood",
  },
  {
    role: "ngo" as const,
    title: "NGO / Hospital",
    description:
      "Manage regional requests, donor networks, inventory, and fulfilment analytics.",
    href: "/auth?role=ngo",
    cta: "Partner sign in",
  },
] as const;
