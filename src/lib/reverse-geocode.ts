export interface ResolvedPlace {
  city: string;
  area: string;
  label: string;
}

function pick(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const next = value?.trim();
    if (next) return next;
  }
  return "";
}

function toPlace(city: string, area: string): ResolvedPlace | null {
  if (!city && !area) return null;
  const resolvedCity = city || area;
  const resolvedArea = area && area !== city ? area : city || area;
  return {
    city: resolvedCity,
    area: resolvedArea,
    label: [resolvedArea, resolvedCity].filter((part, i, all) => all.indexOf(part) === i).join(", "),
  };
}

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  localityInfo?: {
    administrative?: Array<{ name?: string; order?: number; description?: string }>;
    informative?: Array<{ name?: string; description?: string }>;
  };
};

function fromBigDataPayload(data: BigDataCloudResponse): ResolvedPlace | null {
  const admin = [...(data.localityInfo?.administrative ?? [])].sort(
    (a, b) => (b.order ?? 0) - (a.order ?? 0),
  );
  const informative = data.localityInfo?.informative ?? [];
  const neighbourhood = pick(
    admin.find((item) => /neighbourhood|neighborhood|suburb|ward|locality/i.test(item.description ?? ""))
      ?.name,
    informative.find((item) => /neighbourhood|neighborhood|suburb/i.test(item.description ?? ""))
      ?.name,
    data.locality,
  );
  const city = pick(
    data.city,
    admin.find((item) => /city|municipality|town/i.test(item.description ?? ""))?.name,
    data.principalSubdivision,
  );
  return toPlace(city, neighbourhood);
}

async function fromBigDataCloud(
  lat: number,
  lng: number,
  locale: string,
): Promise<ResolvedPlace | null> {
  const lang = locale === "hi" ? "hi" : "en";
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${lang}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return fromBigDataPayload((await res.json()) as BigDataCloudResponse);
}

type NominatimAddress = {
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  village?: string;
  town?: string;
  city?: string;
  state_district?: string;
  county?: string;
  state?: string;
  road?: string;
  residential?: string;
};

export function placeFromNominatim(address: NominatimAddress): ResolvedPlace | null {
  const city = pick(
    address.city,
    address.town,
    address.village,
    address.state_district,
    address.county,
    address.state,
  );
  const area = pick(
    address.neighbourhood,
    address.suburb,
    address.city_district,
    address.residential,
    address.road,
    address.village,
    address.town,
  );
  return toPlace(city, area);
}

async function fromAppApi(lat: number, lng: number): Promise<ResolvedPlace | null> {
  const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
  if (!res.ok) return null;
  const data = (await res.json()) as ResolvedPlace | { error?: string };
  if (!("city" in data) || !data.city) return null;
  return data;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  locale = "en",
): Promise<ResolvedPlace | null> {
  try {
    const primary = await fromBigDataCloud(lat, lng, locale);
    if (primary?.city && primary?.area) return primary;
    const fallback = await fromAppApi(lat, lng);
    return fallback ?? primary;
  } catch {
    return null;
  }
}
