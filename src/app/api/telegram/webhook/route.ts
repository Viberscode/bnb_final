import { NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/telegram";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const update = await request.json();
    await processTelegramUpdate(update);
  } catch {
    /* always ack Telegram */
  }

  return NextResponse.json({ ok: true });
}
