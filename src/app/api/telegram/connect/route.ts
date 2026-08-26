import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isTelegramBotConfigured,
  resolveTelegramBotUsername,
  signDonorLink,
} from "@/lib/telegram";

export async function GET() {
  if (!isTelegramBotConfigured()) {
    return NextResponse.json(
      { error: "Telegram bot token is not configured." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("donor_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      {
        error: "Register as a donor first, then connect Telegram.",
        needDonor: true,
      },
      { status: 400 },
    );
  }

  const username = await resolveTelegramBotUsername();
  const payload = signDonorLink(user.id);
  if (!username || !payload) {
    return NextResponse.json(
      { error: "Could not resolve Telegram bot username." },
      { status: 503 },
    );
  }

  const url = `https://t.me/${username}?start=${payload}`;
  return NextResponse.json({
    ok: true,
    url,
    botUsername: username,
  });
}
