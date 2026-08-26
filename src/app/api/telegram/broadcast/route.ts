import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { donorMatchesRequest, neededBloodGroups } from "@/lib/blood-compatibility";
import {
  isTelegramBotConfigured,
  sendTelegramMessage,
  syncTelegramUpdates,
} from "@/lib/telegram";
import type { BloodGroup } from "@/types";

function siteOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  return new URL(request.url).origin;
}

function personalMessage(input: {
  name: string;
  groups: string;
  hospital: string;
  urgency: string;
  link: string;
}) {
  return [
    "🩸 <b>BloodNearby — LIVE request for you</b>",
    "",
    `Hi ${input.name || "donor"},`,
    `A request matching your blood group is live.`,
    "",
    `<b>Need:</b> ${input.groups}`,
    `<b>Urgency:</b> ${input.urgency}`,
    `<b>Hospital:</b> ${input.hospital}`,
    "",
    "Open this link if you can donate:",
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

  const need = {
    bloodGroup: liveRequest.blood_group as BloodGroup,
    bloodGroups: (liveRequest.blood_groups ?? []) as BloodGroup[],
  };
  const groups = neededBloodGroups(need);
  const link = `${siteOrigin(request)}/invite/${requestId}`;

  if (!isTelegramBotConfigured()) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      link,
      warning: "Telegram bot is not configured. Add TELEGRAM_BOT_TOKEN.",
    });
  }

  // Pick up any /start link taps (works on localhost without a public webhook)
  await syncTelegramUpdates();

  const { data: donors } = await supabase
    .from("donor_profiles")
    .select("id, full_name, blood_group, telegram_chat_id")
    .not("telegram_chat_id", "is", null);

  const recipients = ((donors ?? []) as {
    id: string;
    full_name: string | null;
    blood_group: string;
    telegram_chat_id: string | null;
  }[]).filter((donor) => {
    if (!donor.telegram_chat_id) return false;
    if (donor.id === liveRequest.user_id || donor.id === user.id) return false;
    return donorMatchesRequest(donor.blood_group as BloodGroup, need);
  });

  let sent = 0;
  let failed = 0;
  const queue = [...recipients];
  const workers = Array.from({ length: Math.min(6, queue.length || 1) }, async () => {
    while (queue.length) {
      const donor = queue.shift();
      if (!donor?.telegram_chat_id) return;
      try {
        await sendTelegramMessage(
          donor.telegram_chat_id,
          personalMessage({
            name: donor.full_name?.split(" ")[0] || "donor",
            groups: groups.join(", "),
            hospital: liveRequest.hospital_name || "the hospital",
            urgency: String(liveRequest.urgency ?? "urgent"),
            link,
          }),
        );
        sent += 1;
      } catch {
        failed += 1;
      }
    }
  });
  await Promise.all(workers);

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: recipients.length,
    link,
  });
}
