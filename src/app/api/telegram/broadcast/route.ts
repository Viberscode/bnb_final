import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BLOOD_GROUPS,
  canReceiveFrom,
  neededBloodGroups,
} from "@/lib/blood-compatibility";
import {
  isTelegramConfigured,
  sendTelegramChannelMessage,
} from "@/lib/telegram";
import type { BloodGroup } from "@/types";

function siteOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  return new URL(request.url).origin;
}

function eligibleDonorGroups(need: BloodGroup[]) {
  const set = new Set<BloodGroup>();
  for (const group of need) {
    for (const donor of canReceiveFrom(group)) set.add(donor);
  }
  return BLOOD_GROUPS.filter((group) => set.has(group));
}

function liveRequestMessage(input: {
  groups: string;
  eligible: string;
  hospital: string;
  urgency: string;
  link: string;
}) {
  return [
    "🩸 <b>BloodNearby — LIVE request</b>",
    "",
    `<b>Need:</b> ${input.groups}`,
    `<b>Urgency:</b> ${input.urgency}`,
    `<b>Hospital:</b> ${input.hospital}`,
    "",
    `<b>Eligible donor groups:</b> ${input.eligible}`,
    "If your group matches, open the link and help:",
    input.link,
  ].join("\n");
}

export async function POST(request: Request) {
  let body: { requestId?: string };
  try {
    body = (await request.json()) as { requestId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "Missing request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to notify donors." }, { status: 401 });
  }

  const { data: liveRequest, error } = await supabase
    .from("blood_requests")
    .select(
      "id, user_id, blood_group, blood_groups, hospital_name, urgency, status",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error || !liveRequest) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (liveRequest.user_id && liveRequest.user_id !== user.id) {
    return NextResponse.json(
      { error: "Only the requester can notify donors." },
      { status: 403 },
    );
  }

  const need = neededBloodGroups({
    bloodGroup: liveRequest.blood_group as BloodGroup,
    bloodGroups: (liveRequest.blood_groups ?? []) as BloodGroup[],
  });
  const eligible = eligibleDonorGroups(need);
  const link = `${siteOrigin(request)}/invite/${requestId}`;
  const text = liveRequestMessage({
    groups: need.join(", "),
    eligible: eligible.join(", "),
    hospital: liveRequest.hospital_name || "the hospital",
    urgency: String(liveRequest.urgency ?? "urgent"),
    link,
  });

  if (!isTelegramConfigured()) {
    return NextResponse.json({
      ok: true,
      sent: false,
      link,
      warning:
        "Telegram is not configured. Add TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, and NEXT_PUBLIC_TELEGRAM_CHANNEL_URL.",
    });
  }

  await sendTelegramChannelMessage(text);

  return NextResponse.json({
    ok: true,
    sent: true,
    link,
    eligibleGroups: eligible,
  });
}
