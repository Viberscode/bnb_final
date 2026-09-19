import { NextResponse } from "next/server";
import { DEMO_HOSPITALS } from "@/data/demo";
import { distanceKm, NEARBY_HOSPITAL_RADIUS_KM } from "@/lib/geo";
import type { Hospital } from "@/types";

type OverpassElement = {
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: {
    name?: string;
    "name:en"?: string;
    amenity?: string;
    healthcare?: string;
  };
};

type NominatimHit = {
  place_id?: number;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: {
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

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function localNear(lat: number, lng: number, radiusKm: number): Hospital[] {
  return DEMO_HOSPITALS.filter(
    (hospital) => distanceKm(lat, lng, hospital.lat, hospital.lng) <= radiusKm,
  );
}

function pushUnique(
  hospitals: Hospital[],
  seen: Set<string>,
  hospital: Hospital | null,
) {
  if (!hospital) return;
  const key = normalize(hospital.name);
  if (!key || seen.has(key)) return;
  seen.add(key);
  hospitals.push(hospital);
}

async function fetchOverpass(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<Hospital[]> {
  const query = `
    [out:json][timeout:18];
    (
      nwr["amenity"="hospital"](around:${radiusM},${lat},${lng});
      nwr["healthcare"="hospital"](around:${radiusM},${lat},${lng});
      nwr["amenity"="clinic"](around:${radiusM},${lat},${lng});
    );
    out center tags 80;
  `;
  const body = `data=${encodeURIComponent(query)}`;
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    Accept: "application/json",
    "User-Agent": "BloodNearby/1.0 (hospital map)",
  };

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OverpassElement[] };
      const hospitals: Hospital[] = [];
      const seen = new Set<string>();
      for (const el of data.elements ?? []) {
        const hLat = el.lat ?? el.center?.lat;
        const hLng = el.lon ?? el.center?.lon;
        if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;
        const name =
          el.tags?.["name:en"]?.trim() ||
          el.tags?.name?.trim() ||
          "Hospital";
        pushUnique(hospitals, seen, {
          id: `osm-${el.id ?? `${hLat},${hLng}`}`,
          name,
          area: "Nearby",
          city: "India",
          lat: hLat as number,
          lng: hLng as number,
        });
      }
      if (hospitals.length) return hospitals;
    } catch {
      /* try next endpoint */
    }
  }
  return [];
}

async function fetchNominatimNearby(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Hospital[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const viewbox = [
    lng - dLng,
    lat + dLat,
    lng + dLng,
    lat - dLat,
  ].join(",");

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "25");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("bounded", "1");
    url.searchParams.set("viewbox", viewbox);
    url.searchParams.set("q", "hospital");

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "BloodNearby/1.0 (hospital map)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as NominatimHit[];
    const hospitals: Hospital[] = [];
    const seen = new Set<string>();
    for (const hit of rows) {
      const hLat = Number(hit.lat);
      const hLng = Number(hit.lon);
      if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;
      if (distanceKm(lat, lng, hLat, hLng) > radiusKm + 2) continue;
      const address = hit.address ?? {};
      const name =
        hit.name?.trim() ||
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
      pushUnique(hospitals, seen, {
        id: `nom-${hit.osm_id ?? hit.place_id ?? `${hLat},${hLng}`}`,
        name,
        area: area || city,
        city,
        lat: hLat,
        lng: hLng,
      });
    }
    return hospitals;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Math.min(
    30,
    Math.max(5, Number(searchParams.get("radiusKm") ?? NEARBY_HOSPITAL_RADIUS_KM) ||
      NEARBY_HOSPITAL_RADIUS_KM),
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ hospitals: [] as Hospital[] }, { status: 400 });
  }

  const seen = new Set<string>();
  const hospitals: Hospital[] = [];
  for (const hospital of localNear(lat, lng, radiusKm)) {
    pushUnique(hospitals, seen, hospital);
  }

  const radiusM = Math.round(radiusKm * 1000);
  const [overpass, nominatim] = await Promise.all([
    fetchOverpass(lat, lng, radiusM),
    fetchNominatimNearby(lat, lng, radiusKm),
  ]);

  for (const hospital of [...overpass, ...nominatim]) {
    pushUnique(hospitals, seen, hospital);
    if (hospitals.length >= 40) break;
  }

  hospitals.sort(
    (a, b) =>
      distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng),
  );

  return NextResponse.json({ hospitals });
}
