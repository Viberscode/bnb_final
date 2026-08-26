export function isTelegramConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID,
  );
}

export function telegramChannelUrl() {
  return (
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim() ||
    "https://t.me/"
  );
}

export async function sendTelegramChannelMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) {
    throw new Error("Telegram is not configured.");
  }

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

  return (await response.json()) as { ok?: boolean; result?: { message_id?: number } };
}
