import { db } from "@/lib/db";

export type ApiKeyPolicy = {
  mode: "classic" | "custom";
  allowCatalog: boolean;
  allowBalance: boolean;
  allowOrderStatus: boolean;
  allowOrderCreate: boolean;
  allowOrderCancel: boolean;
  customRateLimit: number;
  hiddenServices: string[];
};

type DbRow = Record<string, unknown>;

type CacheEntry = { value: ApiKeyPolicy; expiresAt: number };

const POLICY_TTL_MS = 5_000;
const DEFAULT_POLICY: ApiKeyPolicy = {
  mode: "classic",
  allowCatalog: true,
  allowBalance: true,
  allowOrderStatus: true,
  allowOrderCreate: true,
  allowOrderCancel: true,
  customRateLimit: 120,
  hiddenServices: [],
};
const policyCache = new Map<number, CacheEntry>();
const policyInFlight = new Map<number, Promise<ApiKeyPolicy>>();

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return fallback;
}

function readHiddenServices(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 200);
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 200) : [];
  } catch {
    return [];
  }
}

export function normalizeApiKeyPolicy(row?: DbRow): ApiKeyPolicy {
  const requestedRate = Number(row?.custom_rate_limit);
  const rate = Number.isFinite(requestedRate) ? Math.min(Math.max(Math.floor(requestedRate), 10), 5_000) : DEFAULT_POLICY.customRateLimit;
  return {
    mode: row?.mode === "custom" ? "custom" : "classic",
    allowCatalog: readBoolean(row?.allow_catalog, true),
    allowBalance: readBoolean(row?.allow_balance, true),
    allowOrderStatus: readBoolean(row?.allow_order_status, true),
    allowOrderCreate: readBoolean(row?.allow_order_create, true),
    allowOrderCancel: readBoolean(row?.allow_order_cancel, true),
    customRateLimit: rate,
    hiddenServices: readHiddenServices(row?.hidden_services),
  };
}

export async function getApiKeyPolicy(keyId: number): Promise<ApiKeyPolicy> {
  const now = Date.now();
  const cached = policyCache.get(keyId);
  if (cached && cached.expiresAt > now) return cached.value;
  const running = policyInFlight.get(keyId);
  if (running) return running;

  const load = (async () => {
    const result = await db.execute({
      sql: "SELECT mode, allow_catalog, allow_balance, allow_order_status, allow_order_create, allow_order_cancel, custom_rate_limit, hidden_services FROM api_key_settings WHERE api_key_id = ?",
      args: [keyId],
    });
    const value = normalizeApiKeyPolicy(result.rows[0] as unknown as DbRow | undefined);
    policyCache.set(keyId, { value, expiresAt: Date.now() + POLICY_TTL_MS });
    return value;
  })();
  policyInFlight.set(keyId, load);
  try {
    return await load;
  } finally {
    if (policyInFlight.get(keyId) === load) policyInFlight.delete(keyId);
  }
}

export async function getApiKeyPolicies(keyIds: number[]): Promise<Map<number, ApiKeyPolicy>> {
  const ids = Array.from(new Set(keyIds.filter((id) => Number.isInteger(id) && id > 0)));
  const policies = new Map<number, ApiKeyPolicy>();
  const now = Date.now();
  const missing: number[] = [];

  for (const id of ids) {
    const cached = policyCache.get(id);
    if (cached && cached.expiresAt > now) policies.set(id, cached.value);
    else missing.push(id);
  }

  if (missing.length > 0) {
    const placeholders = missing.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `SELECT api_key_id, mode, allow_catalog, allow_balance, allow_order_status, allow_order_create, allow_order_cancel, custom_rate_limit, hidden_services FROM api_key_settings WHERE api_key_id IN (${placeholders})`,
      args: missing,
    });
    const rowsById = new Map<number, DbRow>();
    for (const row of result.rows) rowsById.set(Number((row as unknown as DbRow).api_key_id), row as unknown as DbRow);
    for (const id of missing) {
      const value = normalizeApiKeyPolicy(rowsById.get(id));
      policyCache.set(id, { value, expiresAt: Date.now() + POLICY_TTL_MS });
      policies.set(id, value);
    }
  }

  return policies;
}

export function invalidateApiKeyPolicyCache(keyId?: number): void {
  if (keyId !== undefined) {
    policyCache.delete(keyId);
    policyInFlight.delete(keyId);
    return;
  }
  policyCache.clear();
  policyInFlight.clear();
}

export const defaultApiKeyPolicy = DEFAULT_POLICY;
