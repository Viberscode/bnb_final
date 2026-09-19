import { NextResponse } from "next/server";
import { handleEmergencyDtmf } from "@/lib/emergency/escalation-service";
import { processEmergencyEscalation } from "@/lib/emergency/escalation-service";
import { getVoiceCallService, twimlThankYou } from "@/lib/emergency/voice-call-service";

function formToRecord(form: FormData) {
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });
  return params;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId") ?? "";
  const donorId = url.searchParams.get("donorId") ?? "";
  const attemptId = url.searchParams.get("attemptId") ?? "";
  const form = await request.formData();
  const params = formToRecord(form);
  const signature = request.headers.get("x-twilio-signature");
  const voice = getVoiceCallService();
  if (!voice.validateWebhookSignature(signature, request.url, params)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  const digits = params.Digits ?? "";
  const result = await handleEmergencyDtmf({
    requestId,
    donorId,
    attemptId,
    digits,
  });

  if ("advance" in result && result.advance) {
    await processEmergencyEscalation(requestId, url.origin);
  }

  const xml = twimlThankYou(result.message ?? "Thank you.");
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
