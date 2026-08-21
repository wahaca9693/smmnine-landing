import { db } from "@/lib/db";

type SettingsRow = Record<string, unknown>;
type ApiRateState = { windowStartedAt: number; count: number };

const SETTINGS_TTL_MS = 30_000;
const SETTINGS_READ_TIMEOUT_MS = 3_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_KEY = 120;
const rateStates = new Map<number, ApiRateState>();
let enabledCache: { value: boolean; expiresAt: number } | null = null;
let enabledGeneration = 0;
let enabledInFlight: { generation: number; promise: Promise<boolean> } | null = null;

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return fallback;
}

export async function isApiV2Enabled(): Promise<boolean> {
  const now = Date.now();
  if (enabledCache && enabledCache.expiresAt > now) return enabledCache.value;

  const generation = enabledGeneration;
  if (enabledInFlight?.generation === generation) return enabledInFlight.promise;

  const load = (async (): Promise<boolean> => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const result = await Promise.race([
        db.execute("SELECT apiV2Enabled FROM site_settings LIMIT 1"),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("API_V2_SETTINGS_TIMEOUT")), SETTINGS_READ_TIMEOUT_MS);
        }),
      ]);
      const row = result.rows[0] as unknown as SettingsRow | undefined;
      const value = readBoolean(row?.apiV2Enabled, true);
      if (enabledGeneration === generation) {
        enabledCache = { value, expiresAt: Date.now() + SETTINGS_TTL_MS };
      }
      return value;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  })();

  const inFlight = { generation, promise: load };
  enabledInFlight = inFlight;
  try {
    return await load;
  } finally {
    if (enabledInFlight === inFlight) enabledInFlight = null;
  }
}

export function invalidateApiV2EnabledCache(): void {
  enabledCache = null;
  enabledGeneration += 1;
}

export function checkApiRateLimit(
  keyId: number,
  configuredLimit = RATE_LIMIT_PER_KEY,
): { allowed: boolean; remaining: number; retryAfter: number } {
  const limit = Number.isFinite(configuredLimit)
    ? Math.min(Math.max(Math.floor(configuredLimit), 10), 5_000)
    : RATE_LIMIT_PER_KEY;
  const now = Date.now();
  const current = rateStates.get(keyId);
  if (!current || now - current.windowStartedAt >= RATE_WINDOW_MS) {
    rateStates.set(keyId, { windowStartedAt: now, count: 1 });
    if (rateStates.size > 10_000) {
      for (const [id, state] of rateStates) {
        if (now - state.windowStartedAt >= RATE_WINDOW_MS) rateStates.delete(id);
      }
    }
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - current.windowStartedAt)) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count), retryAfter: 0 };
}

export const API_RATE_LIMIT = RATE_LIMIT_PER_KEY;
