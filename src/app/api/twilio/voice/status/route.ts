import { NextResponse } from "next/server";
import {
  handleEmergencyCallStatus,
} from "@/lib/emergency/escalation-service";
import { getVoiceCallService } from "@/lib/emergency/voice-call-service";

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
  const attemptId = url.searchParams.get("attemptId") ?? "";
  const form = await request.formData();
  const params = formToRecord(form);
  const signature = request.headers.get("x-twilio-signature");
  const voice = getVoiceCallService();
  if (!voice.validateWebhookSignature(signature, request.url, params)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  await handleEmergencyCallStatus({
    requestId,
    attemptId,
    callStatus: params.CallStatus ?? "unknown",
    callSid: params.CallSid,
    origin: url.origin,
  });

  return NextResponse.json({ ok: true });
}
