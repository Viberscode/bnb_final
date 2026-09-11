import { NextResponse } from "next/server";
import { DEMO_HOSPITALS } from "@/data/demo";
import { distanceKm } from "@/lib/geo";
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

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function localNear(
  lat: number,
  lng: number,
  radiusKm: number,
): Hospital[] {
  return DEMO_HOSPITALS.filter(
    (hospital) => distanceKm(lat, lng, hospital.lat, hospital.lng) <= radiusKm,
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Math.min(
    25,
    Math.max(1, Number(searchParams.get("radiusKm") ?? 12) || 12),
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ hospitals: [] as Hospital[] }, { status: 400 });
  }

  const local = localNear(lat, lng, radiusKm);
  const seen = new Set(local.map((item) => normalize(item.name)));
  const hospitals: Hospital[] = [...local];

  try {
    const radiusM = Math.round(radiusKm * 1000);
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radiusM},${lat},${lng});
        way["amenity"="hospital"](around:${radiusM},${lat},${lng});
        relation["amenity"="hospital"](around:${radiusM},${lat},${lng});
        node["healthcare"="hospital"](around:${radiusM},${lat},${lng});
        way["healthcare"="hospital"](around:${radiusM},${lat},${lng});
        node["amenity"="clinic"]["name"](around:${radiusM},${lat},${lng});
        way["amenity"="clinic"]["name"](around:${radiusM},${lat},${lng});
      );
      out center tags 80;
    `;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json",
        "User-Agent": "BloodNearby/1.0 (hospital map)",
      },
      body: `data=${encodeURIComponent(query)}`,
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as { elements?: OverpassElement[] };
      for (const el of data.elements ?? []) {
        const hLat = el.lat ?? el.center?.lat;
        const hLng = el.lon ?? el.center?.lon;
        if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;
        const name =
          el.tags?.["name:en"]?.trim() ||
          el.tags?.name?.trim() ||
          "Hospital";
        const key = normalize(name);
        if (seen.has(key)) continue;
        seen.add(key);
        hospitals.push({
          id: `osm-${el.id ?? `${hLat},${hLng}`}`,
          name,
          area: "Nearby",
          city: "Delhi NCR",
          lat: hLat as number,
          lng: hLng as number,
        });
        if (hospitals.length >= 60) break;
      }
    }
  } catch {
    /* local hospitals still returned */
  }

  hospitals.sort(
    (a, b) =>
      distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng),
  );

  return NextResponse.json({ hospitals });
}
