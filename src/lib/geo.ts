/** Haversine distance in km between two WGS84 points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Default radius for hospital recommendations (km). */
export const NEARBY_HOSPITAL_RADIUS_KM = 25;

/** Max hospitals shown in the picker. */
export const NEARBY_HOSPITAL_LIMIT = 6;

/** Sort by distance and keep only hospitals within radius. */
export function getNearbyPlaces<T extends { lat: number; lng: number }>(
  places: T[],
  userLat: number,
  userLng: number,
  options?: { maxRadiusKm?: number; limit?: number },
): (T & { distanceKm: number })[] {
  const maxRadiusKm = options?.maxRadiusKm ?? NEARBY_HOSPITAL_RADIUS_KM;
  const limit = options?.limit ?? NEARBY_HOSPITAL_LIMIT;

  return places
    .map((place) => ({
      ...place,
      distanceKm: distanceKm(userLat, userLng, place.lat, place.lng),
    }))
    .filter((place) => place.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
