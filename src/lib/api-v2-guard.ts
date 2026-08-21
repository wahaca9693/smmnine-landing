import { db } from "@/lib/db";

type SettingsRow = Record<string, unknown>;
type ApiRateState = { windowStartedAt: number; count: number };

const SETTINGS_TTL_MS = 30_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_KEY = 120;
const rateStates = new Map<number, ApiRateState>();
let enabledCache: { value: boolean; expiresAt: number } | null = null;

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return fallback;
}

export async function isApiV2Enabled(): Promise<boolean> {
  const now = Date.now();
  if (enabledCache && enabledCache.expiresAt > now) return enabledCache.value;
  const result = await db.execute("SELECT apiV2Enabled FROM site_settings LIMIT 1");
  const row = result.rows[0] as unknown as SettingsRow | undefined;
  const value = readBoolean(row?.apiV2Enabled, true);
  enabledCache = { value, expiresAt: now + SETTINGS_TTL_MS };
  return value;
}

export function invalidateApiV2EnabledCache(): void {
  enabledCache = null;
}

export function checkApiRateLimit(keyId: number): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const current = rateStates.get(keyId);
  if (!current || now - current.windowStartedAt >= RATE_WINDOW_MS) {
    rateStates.set(keyId, { windowStartedAt: now, count: 1 });
    if (rateStates.size > 10_000) {
      for (const [id, state] of rateStates) {
        if (now - state.windowStartedAt >= RATE_WINDOW_MS) rateStates.delete(id);
      }
    }
    return { allowed: true, remaining: RATE_LIMIT_PER_KEY - 1, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_PER_KEY) {
    const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - current.windowStartedAt)) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }

  current.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_PER_KEY - current.count, retryAfter: 0 };
}

export const API_RATE_LIMIT = RATE_LIMIT_PER_KEY;
