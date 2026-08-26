import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTelegramUpdates } from "@/lib/telegram";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const sync = await syncTelegramUpdates();

  const { data: profile } = await supabase
    .from("donor_profiles")
    .select("telegram_chat_id, telegram_username")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    ...sync,
    linked: Boolean(profile?.telegram_chat_id),
    telegramUsername: profile?.telegram_username ?? null,
  });
}
