import { NextResponse } from "next/server";
import { routeVerifiedRequestNotifications } from "@/lib/emergency/escalation-service";
import { createLiveRequestForUser, type LiveRequestInput } from "@/lib/live-requests";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { BloodGroup, UrgencyLevel } from "@/types";

function parseInput(body: unknown): LiveRequestInput | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  const bloodGroup = row.bloodGroup;
  const urgency = row.urgency;
  const hospitalId = row.hospitalId;
  const hospitalName = row.hospitalName;
  const hospitalArea = row.hospitalArea;
  const contactName = row.contactName;
  const phone = row.phone;
  const units = row.units;
  if (
    typeof bloodGroup !== "string" ||
    typeof urgency !== "string" ||
    typeof hospitalId !== "string" ||
    typeof hospitalName !== "string" ||
    typeof hospitalArea !== "string" ||
    typeof contactName !== "string" ||
    typeof phone !== "string" ||
    typeof units !== "number"
  ) {
    return null;
  }
  return {
    bloodGroup: bloodGroup as BloodGroup,
    urgency: urgency as UrgencyLevel,
    hospitalId,
    hospitalName,
    hospitalArea,
    hospitalLat:
      typeof row.hospitalLat === "number" ? row.hospitalLat : undefined,
    hospitalLng:
      typeof row.hospitalLng === "number" ? row.hospitalLng : undefined,
    contactName,
    phone,
    units,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    voiceNoteUrl:
      typeof row.voiceNoteUrl === "string" ? row.voiceNoteUrl : undefined,
    patientsCount:
      typeof row.patientsCount === "number" ? row.patientsCount : undefined,
    bloodGroups: Array.isArray(row.bloodGroups)
      ? (row.bloodGroups as BloodGroup[])
      : undefined,
    groupUnits:
      row.groupUnits && typeof row.groupUnits === "object"
        ? (row.groupUnits as LiveRequestInput["groupUnits"])
        : undefined,
    distanceKm:
      typeof row.distanceKm === "number" ? row.distanceKm : undefined,
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in with Google before submitting a live request." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseInput(body);
  if (!input) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const item = await createLiveRequestForUser(supabase, user.id, input);
    if (item.verificationStatus === "verified") {
      await routeVerifiedRequestNotifications(item.id, new URL(request.url).origin);
    }
    return NextResponse.json({ item });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create blood request.";
    const status = /already have an open/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
