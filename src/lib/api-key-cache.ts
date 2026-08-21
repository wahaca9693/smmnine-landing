import { db } from "@/lib/db";

type DbRow = Record<string, unknown>;
export type ApiKeyResolution = { userId: number; keyId: number };

type CacheEntry = { value: ApiKeyResolution | null; expiresAt: number };

const API_KEY_CACHE_TTL_MS = 5_000;
const MAX_ENTRIES = 10_000;
const keyCache = new Map<string, CacheEntry>();
const keyLookupsInFlight = new Map<string, Promise<ApiKeyResolution | null>>();

function normalizeKey(key: string): string {
  return key.trim();
}

function isValidUserRow(row: DbRow | undefined): row is DbRow {
  if (!row) return false;
  return Number(row.is_active) === 1
    && Number(row.is_banned) !== 1
    && String(row.status || "active") === "active";
}

export async function resolveApiKey(key: string): Promise<ApiKeyResolution | null> {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;

  const now = Date.now();
  const cached = keyCache.get(normalizedKey);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) keyCache.delete(normalizedKey);
  const running = keyLookupsInFlight.get(normalizedKey);
  if (running) return running;

  const lookup = (async (): Promise<ApiKeyResolution | null> => {
    const result = await db.execute({
      sql: `SELECT ak.id, ak.user_id, ak.is_active, u.is_banned, u.status
            FROM api_keys ak JOIN users u ON u.id = ak.user_id
            WHERE ak.api_key = ?`,
      args: [normalizedKey],
    });
    const row = result.rows[0] as unknown as DbRow | undefined;
    const value = isValidUserRow(row)
      ? { userId: Number(row.user_id), keyId: Number(row.id) }
      : null;
    keyCache.set(normalizedKey, { value, expiresAt: now + API_KEY_CACHE_TTL_MS });
    if (keyCache.size > MAX_ENTRIES) {
      for (const [entryKey, entry] of keyCache) {
        if (entry.expiresAt <= now) keyCache.delete(entryKey);
      }
      if (keyCache.size > MAX_ENTRIES) keyCache.delete(keyCache.keys().next().value ?? normalizedKey);
    }
    return value;
  })();
  keyLookupsInFlight.set(normalizedKey, lookup);
  try {
    return await lookup;
  } finally {
    if (keyLookupsInFlight.get(normalizedKey) === lookup) keyLookupsInFlight.delete(normalizedKey);
  }
}

export function invalidateApiKeyCache(key?: string): void {
  if (key) {
    keyCache.delete(normalizeKey(key));
    return;
  }
  keyCache.clear();
  keyLookupsInFlight.clear();
}
