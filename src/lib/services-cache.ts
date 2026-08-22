type ServicesCache = { at: number; payload: unknown } | null;

let servicesCache: ServicesCache = null;

export const SERVICES_CACHE_MS = 60_000;

export function readServicesCache(options?: { allowStale?: boolean }): unknown | null {
  if (!servicesCache) return null;
  const isFresh = Date.now() - servicesCache.at < SERVICES_CACHE_MS;
  if (!isFresh && !options?.allowStale) return null;
  return servicesCache.payload;
}

export function writeServicesCache(payload: unknown): void {
  servicesCache = { at: Date.now(), payload };
}

export function invalidateServicesCache(): void {
  servicesCache = null;
}
