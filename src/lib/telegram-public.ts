/** Public Telegram channel invite — safe for client components. */

function normalizeChannelUrl(raw?: string | null) {
  const url = raw?.trim() ?? "";
  if (!url) return null;
  // Placeholders like https://t.me/ must not open telegram.org
  if (
    url === "https://t.me" ||
    url === "https://t.me/" ||
    url === "http://t.me" ||
    url === "http://t.me/"
  ) {
    return null;
  }
  if (!/^https?:\/\/(t\.me|telegram\.me)\//i.test(url)) return null;
  return url;
}

export function telegramChannelUrl() {
  return normalizeChannelUrl(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL);
}

export function isTelegramChannelConfigured() {
  return Boolean(telegramChannelUrl());
}
