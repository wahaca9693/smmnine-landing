import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { invalidateApiKeyCache } from "@/lib/api-key-cache";

type DbRow = Record<string, unknown>;
type ApiKeyBody = { name?: unknown; id?: unknown; action?: unknown };

function genKey() {
  return "smm-" + randomBytes(24).toString("hex");
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

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const res = await db.execute({
      sql: "SELECT id, api_key, name, requests_count, last_used_at, is_active, created_at FROM api_keys WHERE user_id = ? ORDER BY id DESC",
      args: [session.userId!],
    });
    return NextResponse.json(withApiUrl(request, { keys: res.rows }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل مفاتيح API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({})) as ApiKeyBody;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const count = await db.execute({ sql: "SELECT COUNT(*) AS c FROM api_keys WHERE user_id = ?", args: [session.userId!] });
    if (Number((count.rows[0] as DbRow | undefined)?.c || 0) >= 3) {
      return NextResponse.json({ error: "الحد الأقصى 3 مفاتيح لكل مستخدم" }, { status: 400 });
    }
    const apiKey = genKey();
    await db.execute({
      sql: "INSERT INTO api_keys (user_id, api_key, name) VALUES (?, ?, ?)",
      args: [session.userId!, apiKey, name || "مفتاحي الرئيسي"],
    });
    invalidateApiKeyCache();
    return NextResponse.json(withApiUrl(request, { message: "تم إنشاء المفتاح", apiKey }));
  } catch (error) {
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
    if (action === "revoke") {
      await db.execute({ sql: "UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?", args: [id, session.userId!] });
      invalidateApiKeyCache();
      return NextResponse.json(withApiUrl(request, { message: "تم إلغاء المفتاح" }));
    }
    if (action === "regenerate") {
      await db.execute({ sql: "UPDATE api_keys SET api_key = ?, requests_count = 0, is_active = 1 WHERE id = ? AND user_id = ?", args: [genKey(), id, session.userId!] });
      invalidateApiKeyCache();
      const fresh = await db.execute({ sql: "SELECT api_key FROM api_keys WHERE id = ? AND user_id = ?", args: [id, session.userId!] });
      const freshRow = fresh.rows[0] as DbRow | undefined;
      return NextResponse.json(withApiUrl(request, { message: "تم تجديد المفتاح", apiKey: freshRow?.api_key }));
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحديث مفتاح API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
