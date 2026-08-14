import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isTwilioWhatsAppConfigured,
  sendTwilioWhatsApp,
  whatsappChatUrl,
} from "@/lib/whatsapp";

type ConnectRole = "requester" | "donor";

export async function POST(request: Request) {
  let body: { requestId?: string; role?: ConnectRole };
  try {
    body = (await request.json()) as { requestId?: string; role?: ConnectRole };
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
    return NextResponse.json({ error: "Sign in to connect on WhatsApp." }, { status: 401 });
  }

  const { data: liveRequest, error: requestError } = await supabase
    .from("blood_requests")
    .select("id, user_id, phone, contact_name, hospital_name, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !liveRequest) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("request_assignments")
    .select("donor_id, donor_name, status")
    .eq("request_id", requestId)
    .maybeSingle();

  if (assignmentError || !assignment?.donor_id) {
    return NextResponse.json(
      { error: "No assigned donor yet. WhatsApp opens after a match." },
      { status: 403 },
    );
  }

  if (assignment.status !== "accepted") {
    return NextResponse.json(
      { error: "WhatsApp opens after the donor confirms the match." },
      { status: 403 },
    );
  }

  const isRequester = liveRequest.user_id === user.id;
  const isDonor = assignment.donor_id === user.id;
  if (!isRequester && !isDonor) {
    return NextResponse.json(
      { error: "Only the matched requester and donor can connect." },
      { status: 403 },
    );
  }

  const { data: donorProfile } = await supabase
    .from("donor_profiles")
    .select("full_name, phone")
    .eq("id", assignment.donor_id)
    .maybeSingle();

  const donorPhone = donorProfile?.phone ?? "";
  const requesterPhone = liveRequest.phone ?? "";
  const donorName = donorProfile?.full_name || assignment.donor_name || "Donor";
  const requesterName = liveRequest.contact_name || "Requester";
  const hospital = liveRequest.hospital_name || "the hospital";

  const targetPhone = isRequester ? donorPhone : requesterPhone;
  const counterpartName = isRequester ? donorName : requesterName;
  const chatText = isRequester
    ? `Hi ${donorName}, this is ${requesterName} from BloodNearby. We were matched for a blood request at ${hospital}.`
    : `Hi ${requesterName}, this is ${donorName} from BloodNearby. I was assigned to your blood request at ${hospital}.`;

  const chatUrl = whatsappChatUrl(targetPhone, chatText);
  if (!chatUrl) {
    return NextResponse.json(
      { error: "The other person's WhatsApp number is missing." },
      { status: 400 },
    );
  }

  let twilioSent = false;
  let twilioError: string | undefined;
  if (isTwilioWhatsAppConfigured()) {
    try {
      const ping = isRequester
        ? `BloodNearby: ${requesterName} wants to connect on WhatsApp about the blood request at ${hospital}. Their number: ${requesterPhone || "shared in the app"}.`
        : `BloodNearby: ${donorName} wants to connect on WhatsApp about the blood request at ${hospital}. Their number: ${donorPhone || "shared in the app"}.`;
      await sendTwilioWhatsApp(targetPhone, ping);
      twilioSent = true;
    } catch (error) {
      twilioError =
        error instanceof Error ? error.message : "Twilio WhatsApp send failed.";
    }
  }

  return NextResponse.json({
    ok: true,
    chatUrl,
    twilioSent,
    twilioError,
    counterpartName,
  });
}
