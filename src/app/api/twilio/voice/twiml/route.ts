import { NextResponse } from "next/server";
import { twimlGatherResponse } from "@/lib/emergency/voice-call-service";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId") ?? "";
  const donorId = url.searchParams.get("donorId") ?? "";
  const attemptId = url.searchParams.get("attemptId") ?? "";
  if (!requestId || !donorId || !attemptId) {
    return new NextResponse("Missing parameters.", { status: 400 });
  }
  const origin = url.origin;
  const gatherUrl = `${origin}/api/twilio/voice/gather?requestId=${encodeURIComponent(requestId)}&donorId=${encodeURIComponent(donorId)}&attemptId=${encodeURIComponent(attemptId)}`;
  const xml = twimlGatherResponse(gatherUrl);
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: Request) {
  return POST(request);
}
