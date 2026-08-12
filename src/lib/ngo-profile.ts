import type { NgoProfile } from "@/types";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const NGO_PROFILE_EVENT = "bloodkit:ngo-profile";
const STORAGE_KEY = "bloodkit-ngo-profile";

type NgoRow = {
  id: string;
  name: string;
  registration_no: string;
  certificate_name: string | null;
  certificate_url: string | null;
  address: string;
  phone: string;
  authorized_person: string;
  joined_at: string;
};

function mapRow(row: NgoRow): NgoProfile {
  return {
    id: row.id,
    name: row.name,
    registrationNo: row.registration_no,
    certificateName: row.certificate_name ?? undefined,
    certificateUrl: row.certificate_url ?? undefined,
    address: row.address,
    phone: row.phone,
    authorizedPerson: row.authorized_person,
    joinedAt: row.joined_at,
  };
}

function storageKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

function readLocal(userId: string): NgoProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as NgoProfile;
  } catch {
    return null;
  }
}

function writeLocal(profile: NgoProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(profile.id), JSON.stringify(profile));
  window.dispatchEvent(new Event(NGO_PROFILE_EVENT));
}

export async function fetchNgoProfile(
  userId?: string,
): Promise<NgoProfile | null> {
  const supabase = tryCreateClient();
  let id = userId;

  if (!id && supabase) {
    const { data } = await supabase.auth.getUser();
    id = data.user?.id;
  }
  if (!id) return null;

  if (supabase && isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("ngo_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const mapped = mapRow(data as NgoRow);
      writeLocal(mapped);
      return mapped;
    }
  }

  return readLocal(id);
}

export async function saveNgoProfile(
  input: Omit<NgoProfile, "id" | "joinedAt"> & { joinedAt?: string },
): Promise<NgoProfile> {
  const supabase = tryCreateClient();
  let userId: string | undefined;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }
  if (!userId) {
    throw new Error("Sign in with Google before registering your NGO.");
  }

  const profile: NgoProfile = {
    id: userId,
    name: input.name.trim(),
    registrationNo: input.registrationNo.trim(),
    certificateName: input.certificateName,
    certificateUrl: input.certificateUrl,
    address: input.address.trim(),
    phone: input.phone.trim(),
    authorizedPerson: input.authorizedPerson.trim(),
    joinedAt: input.joinedAt ?? new Date().toISOString(),
  };

  if (supabase && isSupabaseConfigured()) {
    const payload = {
      id: profile.id,
      name: profile.name,
      registration_no: profile.registrationNo,
      certificate_name: profile.certificateName ?? null,
      certificate_url: profile.certificateUrl ?? null,
      address: profile.address,
      phone: profile.phone,
      authorized_person: profile.authorizedPerson,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("ngo_profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (!error && data) {
      const mapped = mapRow(data as NgoRow);
      writeLocal(mapped);
      return mapped;
    }
  }

  writeLocal(profile);
  return profile;
}

export function subscribeNgoProfile(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(NGO_PROFILE_EVENT, onChange);
  return () => window.removeEventListener(NGO_PROFILE_EVENT, onChange);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the certificate."));
    };
    reader.onerror = () => reject(new Error("Could not read the certificate."));
    reader.readAsDataURL(file);
  });
}
