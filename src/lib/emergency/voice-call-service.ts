import { createHmac } from "crypto";
import { emergencyConfig, isTwilioVoiceConfigured } from "@/lib/emergency/config";
import { emergencyLog } from "@/lib/emergency/log";

export type OutboundVoiceCallInput = {
  toPhone: string;
  twimlUrl: string;
  statusCallbackUrl: string;
  timeoutSeconds: number;
};

export type OutboundVoiceCallResult = {
  callSid: string;
  status: string;
};

export interface VoiceCallService {
  initiateCall(input: OutboundVoiceCallInput): Promise<OutboundVoiceCallResult>;
  validateWebhookSignature(
    signature: string | null,
    url: string,
    params: Record<string, string>,
  ): boolean;
}

function toE164Indian(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("91") ? digits.slice(2) : digits;
  if (local.length !== 10) throw new Error("Invalid donor phone for voice call.");
  return `+91${local}`;
}

class TwilioVoiceCallService implements VoiceCallService {
  async initiateCall(input: OutboundVoiceCallInput): Promise<OutboundVoiceCallResult> {
    if (!isTwilioVoiceConfigured()) {
      throw new Error("Twilio voice is not configured.");
    }
    const sid = emergencyConfig.twilioAccountSid;
    const token = emergencyConfig.twilioAuthToken;
    const from = emergencyConfig.twilioPhoneNumber;
    const body = new URLSearchParams({
      To: toE164Indian(input.toPhone),
      From: from,
      Url: input.twimlUrl,
      Method: "POST",
      StatusCallback: input.statusCallbackUrl,
      StatusCallbackMethod: "POST",
      StatusCallbackEvent: "initiated ringing answered completed",
      Timeout: String(input.timeoutSeconds),
      MachineDetection: "Enable",
    });
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    const json = (await res.json()) as { sid?: string; status?: string; message?: string };
    if (!res.ok || !json.sid) {
      throw new Error(json.message || `Twilio voice call failed (${res.status})`);
    }
    emergencyLog("call_initiated", { callSid: json.sid, status: json.status });
    return { callSid: json.sid, status: json.status ?? "queued" };
  }

  validateWebhookSignature(
    signature: string | null,
    url: string,
    params: Record<string, string>,
  ): boolean {
    if (!signature || !emergencyConfig.twilioAuthToken) return false;
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    const digest = createHmac("sha1", emergencyConfig.twilioAuthToken)
      .update(sorted)
      .digest("base64");
    return digest === signature;
  }
}

let voiceService: VoiceCallService | null = null;

export function getVoiceCallService(): VoiceCallService {
  if (!voiceService) voiceService = new TwilioVoiceCallService();
  return voiceService;
}

export async function sendUrgentSms(toPhone: string, body: string) {
  const sid = emergencyConfig.twilioAccountSid;
  const token = emergencyConfig.twilioAuthToken;
  const from = emergencyConfig.twilioSmsFrom;
  if (!sid || !token || !from) {
    emergencyLog("urgent_sms_skipped", { reason: "twilio_not_configured" });
    return false;
  }
  const digits = toPhone.replace(/\D/g, "");
  const local = digits.startsWith("91") ? digits.slice(2) : digits;
  if (local.length !== 10) return false;
  const to = `+91${local}`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  if (!res.ok) {
    emergencyLog("urgent_sms_failed", { status: res.status });
    return false;
  }
  emergencyLog("urgent_sms_sent", { to: local.slice(-4) });
  return true;
}

export function buildTwimlMessage() {
  return [
    "This is an emergency Blood Nearby alert.",
    "A verified blood request matching your donor profile requires urgent assistance.",
    "Please respond using the options provided.",
  ].join(" ");
}

export function twimlGatherResponse(gatherUrl: string) {
  const say = buildTwimlMessage();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">${escapeXml(say)}</Say>
  <Gather numDigits="1" timeout="8" action="${escapeXml(gatherUrl)}" method="POST">
    <Say voice="Polly.Aditi">Press 1 if you can donate. Press 2 if you cannot. Press 3 for a call back later.</Say>
  </Gather>
  <Say voice="Polly.Aditi">We did not receive a response. Goodbye.</Say>
</Response>`;
}

export function twimlThankYou(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">${escapeXml(message)}</Say>
</Response>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
