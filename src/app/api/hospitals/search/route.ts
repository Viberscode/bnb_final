import { NextResponse } from "next/server";
import { DEMO_HOSPITALS } from "@/data/demo";
import type { Hospital } from "@/types";

type NominatimHit = {
  place_id?: number;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: {
    hospital?: string;
    amenity?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    state_district?: string;
    state?: string;
    county?: string;
  };
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function wordsMatch(haystack: string, query: string) {
  const hay = normalize(haystack);
  const parts = normalize(query).split(" ").filter(Boolean);
  if (!parts.length) return false;
  return parts.every((part) => hay.includes(part));
}

function localMatches(query: string): Hospital[] {
  return DEMO_HOSPITALS.filter((hospital) =>
    wordsMatch(`${hospital.name} ${hospital.area} ${hospital.city}`, query),
  ).slice(0, 8);
}

function fromNominatim(hit: NominatimHit): Hospital | null {
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const address = hit.address ?? {};
  const name =
    hit.name?.trim() ||
    address.hospital?.trim() ||
    hit.display_name?.split(",")[0]?.trim() ||
    "Hospital";
  const area =
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.village ||
    address.town ||
    "";
  const city =
    address.city ||
    address.town ||
    address.state_district ||
    address.county ||
    address.state ||
    "India";
  const id = `osm-${hit.osm_id ?? hit.place_id ?? `${lat},${lng}`}`;

  return { id, name, area: area || city, city, lat, lng };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ hospitals: [] as Hospital[] });
  }

  const local = localMatches(q);
  const seen = new Set(local.map((item) => normalize(item.name)));
  const hospitals: Hospital[] = [...local];

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("q", `${q} hospital`);

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "BloodNearby/1.0 (hospital search)",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const rows = (await res.json()) as NominatimHit[];
      for (const hit of rows) {
        const hospital = fromNominatim(hit);
        if (!hospital) continue;
        const key = normalize(hospital.name);
        if (seen.has(key)) continue;
        seen.add(key);
        hospitals.push(hospital);
        if (hospitals.length >= 10) break;
      }
    }
  } catch {
    /* local suggestions still returned */
  }

  return NextResponse.json({ hospitals });
}
