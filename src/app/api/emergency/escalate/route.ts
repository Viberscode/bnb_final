import { NextResponse } from "next/server";
import {
  processEmergencyEscalation,
  routeVerifiedRequestNotifications,
  verifyBloodRequest,
} from "@/lib/emergency/escalation-service";
import { emergencyConfig } from "@/lib/emergency/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: { requestId?: string; action?: string; secret?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId." }, { status: 400 });
  }

  if (body.action === "process") {
    if (
      emergencyConfig.processSecret &&
      body.secret !== emergencyConfig.processSecret
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const result = await processEmergencyEscalation(requestId, url.origin);
    return NextResponse.json(result);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (body.action === "verify") {
    try {
      await verifyBloodRequest(requestId, user.id);
      await routeVerifiedRequestNotifications(requestId, url.origin);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Verify failed." },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
