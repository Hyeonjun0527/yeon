import type { ReadonlyURLSearchParams } from "next/navigation";

type QueryPatchValue = string | number | boolean | null | undefined;

export type QueryPatch = Record<string, QueryPatchValue>;

function cloneSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
) {
  return new URLSearchParams(searchParams.toString());
}

export function createPatchedSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  patch: QueryPatch,
) {
  const next = cloneSearchParams(searchParams);

  Object.entries(patch).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      next.delete(key);
      return;
    }

    next.set(key, String(rawValue));
  });

  return next;
}

export function createPatchedHref(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  patch: QueryPatch,
) {
  const next = createPatchedSearchParams(searchParams, patch);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function parseCsvParam(value: string | null) {
  if (!value) return [] as string[];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeCsvParam(values: Iterable<string>) {
  const normalized = Array.from(new Set(Array.from(values).filter(Boolean)));
  return normalized.length > 0 ? normalized.join(",") : null;
}

export function isOneOf<T extends string>(
  value: string | null,
  candidates: readonly T[],
): value is T {
  return value !== null && candidates.includes(value as T);
}
