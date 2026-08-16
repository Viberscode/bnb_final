import { NextResponse } from "next/server";
import { placeFromNominatim } from "@/lib/reverse-geocode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "BloodNearby/1.0 (donor location lookup)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 502 });
  }

  const data = (await res.json()) as { address?: Parameters<typeof placeFromNominatim>[0] };
  const place = data.address ? placeFromNominatim(data.address) : null;
  if (!place) {
    return NextResponse.json({ error: "No address found." }, { status: 404 });
  }
  return NextResponse.json(place);
}
