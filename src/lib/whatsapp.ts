export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function whatsappChatUrl(phone: string, text?: string) {
  const e164 = toE164(phone);
  if (!e164) return null;
  const number = e164.replace("+", "");
  const params = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${params}`;
}

export function isTwilioWhatsAppConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM,
  );
}

export async function sendTwilioWhatsApp(toPhone: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = toE164(toPhone);
  if (!sid || !token || !from || !to) {
    throw new Error("Twilio WhatsApp is not configured.");
  }

  const fromValue = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const payload = new URLSearchParams({
    From: fromValue,
    To: `whatsapp:${to}`,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Twilio WhatsApp failed (${response.status})`);
  }

  return (await response.json()) as { sid?: string };
}
