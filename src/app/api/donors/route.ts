import { NextResponse } from "next/server";
import { queryAvailableDonorPage } from "@/lib/donor-profile";
import {
  AVAILABLE_DONOR_PAGE_SIZE,
  emptyPage,
  parsePageParams,
} from "@/lib/pagination";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(emptyPage(0, AVAILABLE_DONOR_PAGE_SIZE));
  }

  const { searchParams } = new URL(request.url);
  const page = parsePageParams(searchParams, AVAILABLE_DONOR_PAGE_SIZE, 48);
  const supabase = await createClient();
  const result = await queryAvailableDonorPage(supabase, page);
  return NextResponse.json(result);
}
