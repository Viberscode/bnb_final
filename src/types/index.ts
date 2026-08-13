export type UserRole = "donor" | "patient" | "ngo";

export type UrgencyLevel = "critical" | "urgent" | "planned";

export type RequestStatus =
  | "pending"
  | "matching"
  | "donor_accepted"
  | "donor_enroute"
  | "completed"
  | "cancelled"
  | "expired";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export interface NetworkStats {
  donorsOnStandby: number;
  requestsFulfilledThisMonth: number;
  avgResponseMinutes: number;
  activeCriticalRequests: number;
  partnerOrgs: number;
  isDemo: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
}

export interface BloodRequest {
  id: string;
  userId?: string;
  bloodGroup: BloodGroup;
  urgency: UrgencyLevel;
  hospitalId: string;
  hospitalName: string;
  hospitalArea: string;
  contactName: string;
  phone: string;
  units: number;
  groupUnits?: Partial<Record<BloodGroup, number>>;
  notes?: string;
  voiceNoteUrl?: string;
  bloodGroups?: BloodGroup[];
  patientsCount?: number;
  status: RequestStatus;
  createdAt: string;
  distanceKm?: number;
  isDemo?: boolean;
  assignment?: DonorAssignment;
}

export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "searching";

export interface DonorAssignment {
  donorId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  donationsCompleted: number;
  distanceKm: number;
  status: AssignmentStatus;
  assignedAt: string;
  expiresAt: string;
  declinedDonorIds: string[];
}

export interface UrgencyOption {
  value: UrgencyLevel;
  label: string;
  detail: string;
  window: string;
}

export interface DonorProfile {
  id: string;
  fullName: string;
  bloodGroup: BloodGroup;
  phone: string;
  email?: string;
  city: string;
  area: string;
  available: boolean;
  lastDonation?: string;
  age?: number;
  notes?: string;
  donationsCompleted: number;
  trustScore: number;
  livesHelped: number;
  avgResponseMinutes: number;
  joinedAt: string;
}

export interface NgoProfile {
  id: string;
  name: string;
  registrationNo: string;
  certificateName?: string;
  certificateUrl?: string;
  address: string;
  phone: string;
  authorizedPerson: string;
  joinedAt: string;
}
