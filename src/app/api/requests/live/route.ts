import { NextResponse } from "next/server";
import { queryLiveRequestPage, parseLivePage } from "@/lib/live-requests";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emptyPage } from "@/lib/pagination";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(emptyPage());
  }

  const { searchParams } = new URL(request.url);
  const page = parseLivePage(searchParams);
  const supabase = await createClient();
  const result = await queryLiveRequestPage(supabase, page);
  return NextResponse.json(result);
}
