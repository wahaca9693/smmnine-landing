import { db } from "@/lib/db";

type ApiKeyRow = { api_key?: unknown };

const baseUrl = process.env.APP_URL || "http://127.0.0.1:3000";
const requestCount = 125;

async function main(): Promise<void> {
  const result = await db.execute({
    sql: `SELECT ak.api_key FROM api_keys ak JOIN users u ON u.id = ak.user_id
          WHERE ak.is_active = 1 AND u.is_banned = 0
            AND COALESCE(u.status, 'active') = 'active'
          ORDER BY ak.id LIMIT 1`,
  });
  const key = String((result.rows[0] as unknown as ApiKeyRow | undefined)?.api_key ?? "");
  if (!key) {
    console.log("ACTIVE_KEY=0");
    return;
  }

  const responses = await Promise.all(Array.from({ length: requestCount }, () => fetch(`${baseUrl}/api/v2?limit=1`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })));
  const ok = responses.filter((response) => response.status === 200).length;
  const limitedResponses = responses.filter((response) => response.status === 429);
  const retryAfter = limitedResponses.find((response) => response.headers.has("retry-after"))?.headers.get("retry-after") ?? "";
  console.log(`ACTIVE_KEY=1\nREQUESTS=${requestCount}\nOK=${ok}\nHTTP_429=${limitedResponses.length}\nRETRY_AFTER_PRESENT=${retryAfter ? 1 : 0}`);
  if (limitedResponses.length === 0 || !retryAfter) process.exitCode = 1;
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "API rate-limit check failed");
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 50);
  });
