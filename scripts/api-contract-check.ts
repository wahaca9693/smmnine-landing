import { db } from "@/lib/db";

type JsonObject = Record<string, unknown>;

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

const baseUrl = process.env.APP_URL || "http://127.0.0.1:3000";

async function readJson(response: Response): Promise<JsonObject> {
  const value: unknown = await response.json().catch(() => ({}));
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function hasArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

async function request(path: string, init?: RequestInit): Promise<{ response: Response; data: JsonObject }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  return { response, data: await readJson(response) };
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const record = (name: string, passed: boolean, detail: string) => checks.push({ name, passed, detail });

  const noKey = await request("/api/v2");
  record("رفض الطلب دون مفتاح", noKey.response.status === 401, `HTTP ${noKey.response.status}`);

  const invalidKey = await request("/api/v2?key=invalid-test-key-000", { headers: { Authorization: "Bearer invalid-test-key-000" } });
  record("رفض المفتاح غير الصالح", invalidKey.response.status === 401, `HTTP ${invalidKey.response.status}`);

  const keyResult = await db.execute({
    sql: `SELECT ak.api_key FROM api_keys ak JOIN users u ON u.id = ak.user_id
          WHERE ak.is_active = 1 AND u.is_banned = 0 AND COALESCE(u.status, 'active') = 'active'
          ORDER BY ak.id LIMIT 1`,
  });
  const key = String((keyResult.rows[0] as unknown as { api_key?: string } | undefined)?.api_key || "");
  if (!key) {
    record("وجود مفتاح اختبار نشط", false, "لم يوجد مفتاح نشط في قاعدة البيانات");
  } else {
    const validGet = await request("/api/v2", { headers: { Authorization: `Bearer ${key}` } });
    const services = validGet.data.services;
    record("قراءة كتالوج الخدمات بالمفتاح", validGet.response.status === 200 && hasArray(services), `HTTP ${validGet.response.status}; services=${hasArray(services) ? services.length : "invalid"}`);

    const invalidOrder = await request("/api/v2?order=not-a-number", { headers: { Authorization: `Bearer ${key}` } });
    record("رفض رقم الطلب غير الصالح", invalidOrder.response.status === 400, `HTTP ${invalidOrder.response.status}`);

    const missingFields = await request("/api/v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    record("رفض إنشاء طلب بمدخلات ناقصة دون استدعاء مزود", missingFields.response.status === 400, `HTTP ${missingFields.response.status}`);

    const badIdempotency = await request("/api/v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": "bad" },
      body: JSON.stringify({}),
    });
    record("رفض مفتاح idempotency القصير", badIdempotency.response.status === 400, `HTTP ${badIdempotency.response.status}`);
  }

  const failed = checks.filter((check) => !check.passed);
  for (const check of checks) console.log(`${check.passed ? "PASS" : "FAIL"} | ${check.name} | ${check.detail}`);
  console.log(`API_CONTRACT_CHECKS=${checks.length} FAILED=${failed.length}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "API contract check failed");
  process.exitCode = 1;
});
