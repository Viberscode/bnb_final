/** Drop test rows created before this instant from the live app. */
export const APP_DATA_RESET_AT = "2026-08-13T14:06:00.000Z";

export function createdAfterReset(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() >= Date.parse(APP_DATA_RESET_AT);
}
