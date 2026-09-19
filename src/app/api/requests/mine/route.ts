import { NextResponse } from "next/server";
import {
  parseMinePage,
  queryActiveRequestForUser,
  queryMyRequestCount,
  queryMyRequestPage,
} from "@/lib/live-requests";
import { emptyPage } from "@/lib/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(emptyPage());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get("countOnly") === "1") {
    const total = await queryMyRequestCount(supabase, user.id);
    return NextResponse.json({ total });
  }

  if (searchParams.get("active") === "1") {
    const item = await queryActiveRequestForUser(supabase, user.id);
    return NextResponse.json({ item });
  }

  const page = parseMinePage(searchParams);
  const result = await queryMyRequestPage(supabase, user.id, page);
  return NextResponse.json(result);
}
