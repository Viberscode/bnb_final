import { createHash, createHmac, timingSafeEqual } from "crypto";
import { createAnonServerClient } from "@/lib/supabase/admin";

export function isTelegramBotConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export function telegramBotUsernameFromEnv() {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() || "";
}

let cachedBotUsername: string | null = null;

export async function resolveTelegramBotUsername() {
  const fromEnv = telegramBotUsernameFromEnv();
  if (fromEnv) return fromEnv;
  if (cachedBotUsername) return cachedBotUsername;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return "";

  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  if (!res.ok) return "";
  const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
  const username = data.result?.username?.trim() || "";
  if (username) cachedBotUsername = username;
  return username;
}

export function signDonorLink(userId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;
  const sig = createHmac("sha256", token).update(userId).digest("hex").slice(0, 16);
  return `link_${userId}_${sig}`;
}

export function verifyDonorLinkPayload(payload: string) {
  const match = payload.match(/^link_([0-9a-f-]{36})_([a-f0-9]{16})$/i);
  if (!match) return null;
  const [, userId, sig] = match;
  const expected = signDonorLink(userId);
  if (!expected) return null;
  const got = `link_${userId}_${sig}`;
  try {
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}

export function parseStartPayload(text: string) {
  const match = text.trim().match(/^\/start(?:@\w+)?\s+(\S+)/i);
  if (!match) return null;
  return verifyDonorLinkPayload(match[1]);
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram is not configured.");

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Telegram send failed (${response.status})`);
  }

  return (await response.json()) as { ok?: boolean };
}

export async function linkDonorTelegramChat(input: {
  donorId: string;
  chatId: string;
  username?: string | null;
}) {
  const supabase = createAnonServerClient();
  const { error } = await supabase.rpc("link_donor_telegram", {
    p_donor_id: input.donorId,
    p_chat_id: input.chatId,
    p_username: input.username ?? null,
  });
  if (error) {
    // Direct update fallback if RPC missing — may fail under RLS
    const { error: updateError } = await supabase
      .from("donor_profiles")
      .update({
        telegram_chat_id: input.chatId,
        telegram_username: input.username ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.donorId);
    if (updateError) throw new Error(error.message || updateError.message);
  }
}

type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: { id?: number; username?: string };
    from?: { username?: string; first_name?: string };
  };
};

export async function processTelegramUpdate(update: TelegramUpdate) {
  const text = update.message?.text ?? "";
  const chatId = update.message?.chat?.id;
  if (!text || chatId == null) return { handled: false as const };

  const donorId = parseStartPayload(text);
  if (!donorId) {
    if (text.startsWith("/start")) {
      await sendTelegramMessage(
        String(chatId),
        [
          "BloodNearby bot is ready.",
          "",
          "To get personal live-request alerts:",
          "1) Register as a donor on the website",
          "2) Tap <b>Get Telegram alerts</b> while signed in",
          "3) Press Start here from that link",
        ].join("\n"),
      );
    }
    return { handled: true as const, linked: false as const };
  }

  try {
    await linkDonorTelegramChat({
      donorId,
      chatId: String(chatId),
      username: update.message?.from?.username || update.message?.chat?.username,
    });
    await sendTelegramMessage(
      String(chatId),
      [
        "✅ <b>Linked!</b>",
        "",
        "You will get a personal Telegram message whenever a live blood request matches your group.",
      ].join("\n"),
    );
    return { handled: true as const, linked: true as const, donorId };
  } catch {
    await sendTelegramMessage(
      String(chatId),
      "Could not link your account. Register as a donor on BloodNearby first, then open the Connect link again.",
    );
    return { handled: true as const, linked: false as const, donorId };
  }
}

/** Local-dev friendly: pull /start messages without a public webhook. */
export async function syncTelegramUpdates() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { processed: 0, linked: 0 };

  // getUpdates does not work while a webhook is set
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);

  const res = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?timeout=0&allowed_updates=${encodeURIComponent('["message"]')}`,
  );
  if (!res.ok) return { processed: 0, linked: 0 };
  const data = (await res.json()) as { ok?: boolean; result?: TelegramUpdate[] };
  const updates = data.result ?? [];
  let linked = 0;
  let maxId = 0;

  for (const update of updates) {
    if (typeof update.update_id === "number") {
      maxId = Math.max(maxId, update.update_id);
    }
    const result = await processTelegramUpdate(update);
    if (result.linked) linked += 1;
  }

  if (maxId > 0) {
    await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${maxId + 1}&timeout=0`,
    );
  }

  return { processed: updates.length, linked };
}

export function isTelegramConfigured() {
  return isTelegramBotConfigured();
}

export function webhookSecretFingerprint() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}
