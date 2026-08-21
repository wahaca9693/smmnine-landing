import { db } from "@/lib/db";

type ApiKeyRow = { api_key?: unknown };
type JsonObject = Record<string, unknown>;

const baseUrl = process.env.APP_URL || "http://127.0.0.1:3000";
const timeoutMs = 30_000;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

async function fetchWithTimeout(path: string, init?: RequestInit): Promise<{ status: number; body: JsonObject }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const parsed: unknown = await response.json().catch(() => ({}));
  return { status: response.status, body: asObject(parsed) };
}

async function main(): Promise<void> {
  const noKey = await fetchWithTimeout("/api/v2");
  console.log(`NO_KEY_STATUS=${noKey.status}`);

  console.log("KEY_LOOKUP_START=1");
  const result = await Promise.race([
    db.execute({
      sql: `SELECT ak.api_key FROM api_keys ak JOIN users u ON u.id = ak.user_id
            WHERE ak.is_active = 1 AND u.is_banned = 0
              AND COALESCE(u.status, 'active') = 'active'
            ORDER BY ak.id LIMIT 1`,
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("key lookup timeout after 30s")), timeoutMs)),
  ]);
  console.log("KEY_LOOKUP_DONE=1");
  const key = String((result.rows[0] as unknown as ApiKeyRow | undefined)?.api_key ?? "");
  if (!key) {
    console.log("ACTIVE_KEY=0");
    return;
  }

  console.log("AUTH_GET_START=1");
  const catalog = await fetchWithTimeout("/api/v2?limit=1", {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log("AUTH_GET_DONE=1");
  const services = Array.isArray(catalog.body.services) ? catalog.body.services.length : -1;
  console.log(`ACTIVE_KEY=1\nAUTH_GET_STATUS=${catalog.status}\nAUTH_GET_ITEMS=${services}\nAUTH_GET_TOTAL=${Number(catalog.body.total ?? -1)}`);

  const invalidPost = await fetchWithTimeout("/api/v2", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  console.log(`INVALID_POST_STATUS=${invalidPost.status}`);
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "API runtime check failed");
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 50);
  });
