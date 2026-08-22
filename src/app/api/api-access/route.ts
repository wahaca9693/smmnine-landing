import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { invalidateApiKeyCache } from "@/lib/api-key-cache";
import { getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";
import { defaultApiKeyPolicy, getApiKeyPolicies, getApiKeyPolicy, invalidateApiKeyPolicyCache, type ApiKeyPolicy } from "@/lib/api-key-policy";

type DbRow = Record<string, unknown>;
type ApiKeyBody = {
  name?: unknown;
  id?: unknown;
  action?: unknown;
  mode?: unknown;
  allowCatalog?: unknown;
  allowBalance?: unknown;
  allowOrderStatus?: unknown;
  allowOrderCreate?: unknown;
  allowOrderCancel?: unknown;
  customRateLimit?: unknown;
  hiddenServices?: unknown;
};

function genKey(): string {
  return "smm-" + randomBytes(24).toString("hex");
}

function maskApiKey(value: unknown): string {
  const key = String(value ?? "");
  if (key.length < 10) return "••••••••";
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

function getApiBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : url.protocol.replace(":", "");
  return `${protocol}://${host}/api/v2`;
}

function withApiUrl(request: Request, payload: Record<string, unknown>) {
  return { ...payload, apiBaseUrl: getApiBaseUrl(request), apiPath: "/api/v2" };
}

function authErrorResponse(error: unknown): NextResponse | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "يجب تسجيل الدخول للوصول إلى مفاتيح API" }, {
      status: 401,
      headers: { "WWW-Authenticate": "Session" },
    });
  }
  if (message === "Forbidden" || message === "Account banned") {
    return NextResponse.json({ error: message === "Account banned" ? "الحساب محظور" : "ليس لديك صلاحية كافية" }, { status: 403 });
  }
  return null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function normalizeHiddenServices(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .map(String)
    .map((item) => item.trim())
    .filter((item) => /^svc_[a-f0-9]{20}$/.test(item))))
    .slice(0, 200);
}

function parsePolicy(body: ApiKeyBody, current: ApiKeyPolicy): ApiKeyPolicy {
  const requestedRate = Number(body.customRateLimit);
  const customRateLimit = Number.isFinite(requestedRate)
    ? Math.min(Math.max(Math.floor(requestedRate), 10), 5_000)
    : current.customRateLimit;
  const mode = body.mode === "custom" ? "custom" : body.mode === "classic" ? "classic" : current.mode;
  return {
    mode,
    allowCatalog: readBoolean(body.allowCatalog, current.allowCatalog),
    allowBalance: readBoolean(body.allowBalance, current.allowBalance),
    allowOrderStatus: readBoolean(body.allowOrderStatus, current.allowOrderStatus),
    allowOrderCreate: readBoolean(body.allowOrderCreate, current.allowOrderCreate),
    allowOrderCancel: readBoolean(body.allowOrderCancel, current.allowOrderCancel),
    customRateLimit,
    hiddenServices: body.hiddenServices === undefined ? current.hiddenServices : normalizeHiddenServices(body.hiddenServices),
  };
}

function policyArgs(keyId: number, policy: ApiKeyPolicy): Array<string | number> {
  return [
    keyId,
    policy.mode,
    policy.allowCatalog ? 1 : 0,
    policy.allowBalance ? 1 : 0,
    policy.allowOrderStatus ? 1 : 0,
    policy.allowOrderCreate ? 1 : 0,
    policy.allowOrderCancel ? 1 : 0,
    policy.customRateLimit,
    JSON.stringify(policy.hiddenServices),
  ];
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const resource = new URL(request.url).searchParams.get("resource");
    if (resource === "catalog") {
      const catalog = await loadServiceCatalog();
      const services = catalog.map((service) => ({
        id: getPublicServiceId(service),
        name: service.name,
        name_ar: service.nameAr,
        description: service.description,
        description_ar: service.descriptionAr,
        category: service.category,
        category_ar: service.category,
        type: service.type,
      }));
      return NextResponse.json(withApiUrl(request, { services }));
    }
    const res = await db.execute({
      sql: "SELECT id, api_key, name, requests_count, last_used_at, is_active, created_at FROM api_keys WHERE user_id = ? ORDER BY id DESC",
      args: [session.userId!],
    });
    const rows = res.rows as unknown as DbRow[];
    const policies = await getApiKeyPolicies(rows.map((row) => Number(row.id)));
    const keys = rows.map((item) => {
      const id = Number(item.id);
      return {
        id,
        api_key: maskApiKey(item.api_key),
        name: String(item.name ?? "مفتاح API"),
        requests_count: Number(item.requests_count ?? 0),
        last_used_at: item.last_used_at == null ? null : String(item.last_used_at),
        is_active: Number(item.is_active ?? 0),
        created_at: String(item.created_at ?? ""),
        policy: policies.get(id) ?? defaultApiKeyPolicy,
      };
    });
    return NextResponse.json(withApiUrl(request, { keys }));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "تعذر تحميل مفاتيح API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({})) as ApiKeyBody;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    // لا يوجد حدّ منخفض لعدد عمليات التدوير؛ يبقى مفتاح واحد فعّالًا فقط.
    await db.execute({ sql: "UPDATE api_keys SET is_active = 0 WHERE user_id = ?", args: [session.userId!] });
    const apiKey = genKey();
    const inserted = await db.execute({
      sql: "INSERT INTO api_keys (user_id, api_key, name) VALUES (?, ?, ?)",
      args: [session.userId!, apiKey, name || "مفتاحي الرئيسي"],
    });
    const keyId = Number(inserted.lastInsertRowid);
    if (!Number.isInteger(keyId) || keyId <= 0) throw new Error("تعذر تحديد المفتاح الجديد");
    await db.execute({
      sql: "INSERT OR IGNORE INTO api_key_settings (api_key_id) VALUES (?)",
      args: [keyId],
    });
    invalidateApiKeyCache();
    invalidateApiKeyPolicyCache(keyId);
    return NextResponse.json(withApiUrl(request, { message: "تم إنشاء المفتاح؛ احفظه الآن لأنه لن يظهر كاملًا مرة أخرى", keyId, apiKey }));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "تعذر إنشاء مفتاح API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json() as ApiKeyBody;
    const id = Number(body.id || 0);
    const action = typeof body.action === "string" ? body.action : "";
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف المفتاح غير صالح" }, { status: 400 });

    const owned = await db.execute({ sql: "SELECT id FROM api_keys WHERE id = ? AND user_id = ?", args: [id, session.userId!] });
    if (owned.rows.length === 0) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });

    if (action === "revoke") {
      await db.execute({ sql: "UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?", args: [id, session.userId!] });
      invalidateApiKeyCache();
      invalidateApiKeyPolicyCache(id);
      return NextResponse.json(withApiUrl(request, { message: "تم إلغاء المفتاح" }));
    }

    if (action === "regenerate") {
      const apiKey = genKey();
      await db.execute({ sql: "UPDATE api_keys SET is_active = 0 WHERE user_id = ? AND id != ?", args: [session.userId!, id] });
      await db.execute({ sql: "UPDATE api_keys SET api_key = ?, requests_count = 0, is_active = 1 WHERE id = ? AND user_id = ?", args: [apiKey, id, session.userId!] });
      invalidateApiKeyCache();
      return NextResponse.json(withApiUrl(request, { message: "تم تجديد المفتاح؛ احفظه الآن لأنه لن يظهر كاملًا مرة أخرى", keyId: id, apiKey }));
    }

    if (action === "settings") {
      const current = await getApiKeyPolicy(id);
      const policy = parsePolicy(body, current);
      await db.execute({ sql: "INSERT OR IGNORE INTO api_key_settings (api_key_id) VALUES (?)", args: [id] });
      await db.execute({
        sql: "UPDATE api_key_settings SET mode = ?, allow_catalog = ?, allow_balance = ?, allow_order_status = ?, allow_order_create = ?, allow_order_cancel = ?, custom_rate_limit = ?, hidden_services = ?, updated_at = CURRENT_TIMESTAMP WHERE api_key_id = ?",
        args: [policy.mode, policy.allowCatalog ? 1 : 0, policy.allowBalance ? 1 : 0, policy.allowOrderStatus ? 1 : 0, policy.allowOrderCreate ? 1 : 0, policy.allowOrderCancel ? 1 : 0, policy.customRateLimit, JSON.stringify(policy.hiddenServices), id],
      });
      invalidateApiKeyPolicyCache(id);
      return NextResponse.json(withApiUrl(request, { message: "تم حفظ إعدادات المفتاح", policy }));
    }

    if (action === "reset-settings") {
      await db.execute({
        sql: "INSERT INTO api_key_settings (api_key_id, mode, allow_catalog, allow_balance, allow_order_status, allow_order_create, allow_order_cancel, custom_rate_limit, hidden_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(api_key_id) DO UPDATE SET mode = excluded.mode, allow_catalog = excluded.allow_catalog, allow_balance = excluded.allow_balance, allow_order_status = excluded.allow_order_status, allow_order_create = excluded.allow_order_create, allow_order_cancel = excluded.allow_order_cancel, custom_rate_limit = excluded.custom_rate_limit, hidden_services = excluded.hidden_services, updated_at = CURRENT_TIMESTAMP",
        args: policyArgs(id, defaultApiKeyPolicy),
      });
      invalidateApiKeyPolicyCache(id);
      return NextResponse.json(withApiUrl(request, { message: "عادت إعدادات المفتاح إلى الوضع الكلاسيكي", policy: defaultApiKeyPolicy }));
    }

    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "تعذر تحديث مفتاح API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
