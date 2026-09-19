export const LIVE_REQUEST_PAGE_SIZE = 12;
export const MY_REQUEST_PAGE_SIZE = 10;
export const AVAILABLE_DONOR_PAGE_SIZE = 24;
/** Matching only needs a nearby pool, not the whole table. */
export const MATCH_DONOR_LIMIT = 48;

export type PageParams = {
  offset: number;
  limit: number;
};

export type PageResult<T> = {
  items: T[];
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number | null;
};

export function emptyPage<T>(offset = 0, limit = LIVE_REQUEST_PAGE_SIZE): PageResult<T> {
  return { items: [], offset, limit, hasMore: false, total: 0 };
}

export function parsePageParams(
  searchParams: URLSearchParams,
  fallbackLimit: number,
  maxLimit = 50,
): PageParams {
  const rawLimit = Number(searchParams.get("limit") ?? fallbackLimit);
  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, Math.round(rawLimit)))
    : fallbackLimit;
  const offset = Number.isFinite(rawOffset)
    ? Math.max(0, Math.round(rawOffset))
    : 0;
  return { offset, limit };
}

export function pageFromRows<T>(
  rows: T[],
  params: PageParams,
  total: number | null,
): PageResult<T> {
  const hasMore =
    typeof total === "number"
      ? params.offset + rows.length < total
      : rows.length === params.limit;
  return {
    items: rows,
    offset: params.offset,
    limit: params.limit,
    hasMore,
    total,
  };
}

export function mergeUniqueById<T extends { id: string }>(
  current: T[],
  incoming: T[],
  mode: "append" | "prepend" = "append",
): T[] {
  const seen = new Set(current.map((item) => item.id));
  const extra = incoming.filter((item) => !seen.has(item.id));
  return mode === "prepend" ? [...extra, ...current] : [...current, ...extra];
}
