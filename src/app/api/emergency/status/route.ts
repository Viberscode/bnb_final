import { NextResponse } from "next/server";
import { fetchEscalationPublicStatus } from "@/lib/emergency/escalation-service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId")?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: liveRequest } = await supabase
    .from("blood_requests")
    .select("id, user_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!liveRequest) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: ngo } = await supabase
    .from("ngo_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner = liveRequest.user_id === user.id;
  if (!isOwner && !ngo) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const status = await fetchEscalationPublicStatus(requestId);
  return NextResponse.json({ status });
}
