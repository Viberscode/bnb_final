import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isTwilioWhatsAppConfigured,
  sendTwilioWhatsApp,
} from "@/lib/whatsapp";

function siteOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  return new URL(request.url).origin;
}

function inviteMessage(input: {
  group: string;
  hospital: string;
  urgency: string;
  link: string;
}) {
  return [
    "BloodNearby: a blood request is LIVE now.",
    `Need: ${input.group} · ${input.urgency} · ${input.hospital}`,
    "Open this link and tap Accept if you can donate. Only donors who accept can be matched — even if you are offline right now.",
    input.link,
    "If you ignore or decline, you will not be assigned.",
  ].join("\n\n");
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
    return NextResponse.json({ error: "Only the requester can notify donors." }, { status: 403 });
  }

  const { data: donors } = await supabase
    .from("donor_profiles")
    .select("id, phone, blood_group, full_name");

  const rows = (donors ?? []) as {
    id: string;
    phone: string | null;
    blood_group: string;
    full_name: string | null;
  }[];

  const groups = (liveRequest.blood_groups ?? []) as string[];
  const recipients = rows.filter((donor) => {
    if (!donor.phone) return false;
    if (donor.id === liveRequest.user_id || donor.id === user.id) return false;
    return true;
  });

  const link = `${siteOrigin(request)}/invite/${requestId}`;
  const bodyText = inviteMessage({
    group: groups.length ? groups.join(", ") : liveRequest.blood_group,
    hospital: liveRequest.hospital_name || "the hospital",
    urgency: String(liveRequest.urgency ?? "urgent"),
    link,
  });

  if (!isTwilioWhatsAppConfigured()) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: recipients.length,
      link,
      warning:
        "Twilio WhatsApp is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.",
    });
  }

  let sent = 0;
  let failed = 0;
  const queue = [...recipients];
  const workers = Array.from({ length: Math.min(6, queue.length || 1) }, async () => {
    while (queue.length) {
      const donor = queue.shift();
      if (!donor) return;
      try {
        await sendTwilioWhatsApp(donor.phone ?? "", bodyText);
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
