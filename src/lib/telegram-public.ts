/** Public Telegram channel invite — safe for client components. */
export function telegramChannelUrl() {
  const url = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim();
  if (url) return url;
  return "https://t.me/";
}

export function isTelegramChannelConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim());
}
