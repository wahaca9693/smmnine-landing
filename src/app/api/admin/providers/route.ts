import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db, initDb } from "@/lib/db";

const DEFAULT_MARKUP = 30; // هامش الربح الافتراضي %

function applyMarkup(rate: number, markup: number): number {
  return Math.round((rate * (1 + markup / 100)) * 1000) / 1000;
}

// اختبار الاتصال بالمزود (SMM Panels API القياسي)
async function testProvider(apiUrl: string, apiKey: string): Promise<{ ok: boolean; balance?: string; error?: string }> {
  const url = String(apiUrl).replace(/\/+$/, "");
  const body = new URLSearchParams({ key: apiKey, action: "services" });
  try {
    const res = await fetch(url + "/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const msg = String(data?.error || "").toLowerCase();
    if (!res.ok) {
      if (msg.includes("invalid key") || msg.includes("invalid api key") || msg.includes("key") || res.status === 401) {
        return { ok: false, error: "مفتاح API غير صالح — تحقق من مفتاحك في لوحة المزود الخارجي" };
      }
      if (res.status === 404) {
        return { ok: false, error: "رابط API غير صحيح — استخدم رابط لوحة المزود بدون /api/v2 (النظام يضيفه تلقائيًا)" };
      }
      return { ok: false, error: `HTTP ${res.status}: ${data?.error || "المزود يرفض الاتصال"}` };
    }
    if (Array.isArray(data)) {
      return { ok: true, balance: `${data.length} خدمة` };
    }
    if (data.error) {
      const e = String(data.error).toLowerCase();
      if (e.includes("key") || res.status === 401) {
        return { ok: false, error: "مفتاح API غير صالح — تحقق من مفتاحك في لوحة المزود الخارجي" };
      }
      return { ok: false, error: String(data.error) };
    }
    return { ok: true, balance: String(data.balance || data.remaining || "") };
  } catch (err: any) {
    const e = String(err.message || "");
    if (e.includes("fetch") && (e.includes("failed") || e.includes("timed") || e.includes("timeout"))) {
      return { ok: false, error: "تعذر الاتصال بالسيرفر — تحقق من الرابط أو أن السيرفر يحجب المنطقة" };
    }
    return { ok: false, error: "تعذر الاتصال بالمزود — تحقق من الرابط" };
  }
}

async function fetchProviderServices(apiUrl: string, apiKey: string): Promise<any[]> {
  const url = String(apiUrl).replace(/\/+$/, "");
  const body = new URLSearchParams({ key: apiKey, action: "services" });
  const res = await fetch(url + "/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  if (!Array.isArray(data)) throw new Error("استجابة غير صالحة من المزود");
  return data;
}

async function fetchProviderBalance(apiUrl: string, apiKey: string): Promise<string> {
  const url = String(apiUrl).replace(/\/+$/, "");
  const body = new URLSearchParams({ key: apiKey, action: "balance" });
  try {
    const res = await fetch(url + "/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (res.ok && !data.error) {
      return String(data.balance ?? data.remaining ?? "");
    }
    return "غير متاح";
  } catch {
    return "غير متاح";
  }
}

// تنفيذ طلب عبر المزود (SMM Panels: action=add)
export async function executeProviderOrder(params: {
  providerId: number;
  service: string;
  link: string;
  quantity: string;
}): Promise<{ ok: boolean; remoteOrderId?: string; error?: string }> {
  const prov = await db.execute({ sql: "SELECT api_url, api_key FROM providers WHERE id = ? AND is_active = 1", args: [params.providerId] });
  const p = prov.rows[0] as any;
  if (!p) return { ok: false, error: "المزود غير موجود أو معطّل" };
  const url = String(p.api_url).replace(/\/+$/, "");
  const body = new URLSearchParams({
    key: p.api_key,
    action: "add",
    service: params.service,
    link: params.link,
    quantity: params.quantity,
  });
  try {
    const res = await fetch(url + "/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, remoteOrderId: String(data.order ?? "") };
  } catch (err: any) {
    return { ok: false, error: err.message || "تعذر إرسال الطلب للمزود" };
  }
}

export async function GET(request: Request) {
  try {
    await initDb();
    const session = await requireAdmin();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    if (mode === "services") {
      const providerId = url.searchParams.get("providerId");
      const rows = await db.execute({
        sql: `SELECT ps.*, p.name AS provider_name FROM provider_services ps
              LEFT JOIN providers p ON p.id = ps.provider_id
              ${providerId ? "WHERE ps.provider_id = ?" : ""}
              ORDER BY ps.provider_id, ps.remote_service_id`,
        args: providerId ? [Number(providerId)] : [],
      });
      return NextResponse.json({ services: rows.rows });
    }

    // استعراض خدمات مزود من سيرفره الخارجي دون إدخالها (للمعاينة قبل الإضافة)
    if (mode === "preview") {
      const providerId = url.searchParams.get("providerId");
      const prov = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [Number(providerId)] });
      const p = prov.rows[0] as any;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      try {
        const services = await fetchProviderServices(p.api_url, p.api_key);
        // جلب الخدمات المضافة مسبقًا من هذا المزود لتحديد المضافة منها
        const existing = await db.execute({
          sql: "SELECT remote_service_id, is_active, is_new, name FROM provider_services WHERE provider_id = ?",
          args: [Number(providerId)],
        });
        const added = new Set((existing.rows as any[]).map((r) => String(r.remote_service_id)));
        return NextResponse.json({
          services: services.map((s: any) => ({
            ...s,
            added: added.has(String(s.service)),
            category: String(s.category || ""),
            type: String(s.type || ""),
          })),
          count: services.length,
          provider: { id: p.id, name: p.name },
        });
      } catch (err: any) {
        return NextResponse.json({ error: "تعذر جلب خدمات المزود: " + (err.message || "") }, { status: 502 });
      }
    }

    if (mode === "logs") {
      const rows = await db.execute({
        sql: `SELECT l.*, p.name AS provider_name FROM provider_order_logs l
              LEFT JOIN providers p ON p.id = l.provider_id
              ORDER BY l.created_at DESC LIMIT 100`,
        args: [],
      });
      return NextResponse.json({ logs: rows.rows });
    }

    const rows = await db.execute({ sql: "SELECT * FROM providers ORDER BY id DESC" });
    return NextResponse.json({ providers: rows.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const session = await requireAdmin();
    const body = await request.json();
    const { action } = body;

    // 1) إضافة/تعديل مزود
    if (action === "save") {
      const { id, name, api_url, api_key, notes, test } = body;
      if (!name || !api_url || !api_key) {
        return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
      }
      const trimmed = {
        name: String(name).trim(),
        api_url: String(api_url).trim().replace(/\/+$/, ""),
        api_key: String(api_key).trim(),
        notes: notes ? String(notes).trim() : "",
      };
      // اختبار الاتصال قبل الحفظ
      const probe = await testProvider(trimmed.api_url, trimmed.api_key);
      if (!probe.ok) {
        return NextResponse.json({ error: `فشل الاتصال بالمزود: ${probe.error}` }, { status: 400 });
      }
      const balance = await fetchProviderBalance(trimmed.api_url, trimmed.api_key);
      if (id) {
        await db.execute({
          sql: `UPDATE providers SET name=?, api_url=?, api_key=?, notes=?, balance=?, balance_fetched_at=CURRENT_TIMESTAMP WHERE id=?`,
          args: [trimmed.name, trimmed.api_url, trimmed.api_key, trimmed.notes, balance, id],
        });
        return NextResponse.json({ provider: { id }, balance, probe });
      }
      const r = await db.execute({
        sql: `INSERT INTO providers (name, api_url, api_key, notes, balance, balance_fetched_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`,
        args: [trimmed.name, trimmed.api_url, trimmed.api_key, trimmed.notes, balance],
      });
      return NextResponse.json({ provider: { id: Number(r.lastInsertRowid) }, balance, probe });
    }

    // 2) مزامنة خدمات المزود
    if (action === "sync") {
      const { providerId, markup } = body;
      const prov = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [Number(providerId)] });
      const p = prov.rows[0] as any;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      const services = await fetchProviderServices(p.api_url, p.api_key);
      const markupPct = Number(markup ?? p.markup_percent ?? DEFAULT_MARKUP) || DEFAULT_MARKUP;
      // حذف خدمات المزود القديمة واستيراد الجديدة
      await db.execute({ sql: "DELETE FROM provider_services WHERE provider_id = ?", args: [Number(providerId)] });
      let inserted = 0;
      for (const s of services) {
        const sellRate = applyMarkup(Number(s.rate) || 0, markupPct);
        await db.execute({
          sql: `INSERT INTO provider_services (provider_id, remote_service_id, name, category, rate, min, max, type, markup_percent, sell_rate, is_new)
                VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
          args: [
            Number(providerId),
            String(s.service),
            String(s.name || ""),
            String(s.category || ""),
            Number(s.rate) || 0,
            Number(s.min) || 0,
            Number(s.max) || 0,
            String(s.type || ""),
            markupPct,
            sellRate,
          ],
        });
        inserted++;
      }
      const balance = await fetchProviderBalance(p.api_url, p.api_key);
      await db.execute({
        sql: `UPDATE providers SET balance=?, balance_fetched_at=CURRENT_TIMESTAMP WHERE id=?`,
        args: [balance, Number(providerId)],
      });
      return NextResponse.json({ imported: inserted, balance, services: inserted });
    }

    // 3) تحديث رصيد جميع المزودين من سيرفراتهم الخارجية
    if (action === "refresh-balances") {
      const rows = await db.execute({ sql: "SELECT * FROM providers WHERE is_active = 1" });
      const updated: any[] = [];
      for (const p of rows.rows as any[]) {
        const balance = await fetchProviderBalance(p.api_url, p.api_key);
        await db.execute({
          sql: `UPDATE providers SET balance=?, balance_fetched_at=CURRENT_TIMESTAMP WHERE id=?`,
          args: [balance, p.id],
        });
        updated.push({ id: p.id, name: p.name, balance });
      }
      return NextResponse.json({ ok: true, updated });
    }

    // 4) تفعيل/إيقاف مزود
    if (action === "toggle") {
      await db.execute({
        sql: "UPDATE providers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [Number(body.id)],
      });
      return NextResponse.json({ ok: true });
    }

    // 5) حذف مزود
    if (action === "delete") {
      await db.execute({ sql: "DELETE FROM providers WHERE id = ?", args: [Number(body.id)] });
      return NextResponse.json({ ok: true });
    }

    // 6) حذف خدمة مزود (تخفى نهائيًا — تعود عند المزامنة التالية)
    if (action === "delete-service") {
      await db.execute({ sql: "DELETE FROM provider_services WHERE id = ?", args: [Number(body.id)] });
      return NextResponse.json({ ok: true });
    }

    // 6-ب) إضافة انتقائية لخدمة واحدة من مزود مربوط (مع وسم جديد + سعر عرض)
    if (action === "add-service") {
      const providerId = Number(body.provider_id ?? body.providerId);
      const { remote_service_id, markup_percent } = body;
      const prov = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [Number(providerId)] });
      const p = prov.rows[0] as any;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      try {
        const services = await fetchProviderServices(p.api_url, p.api_key);
        const target = services.find((s: any) => String(s.service) === String(remote_service_id));
        if (!target) return NextResponse.json({ error: "الخدمة غير موجودة لدى المزود" }, { status: 404 });
        const markupPct = Number(markup_percent ?? p.markup_percent ?? DEFAULT_MARKUP) || DEFAULT_MARKUP;
        const costRate = Number.isFinite(Number(target.rate)) ? Number(target.rate) : 0;
        const sellRate = applyMarkup(costRate, markupPct);
        console.error("DEBUG add-service target:", JSON.stringify(target));
        const exists = await db.execute({
          sql: "SELECT id FROM provider_services WHERE provider_id = ? AND remote_service_id = ?",
          args: [Number(providerId), String(remote_service_id)],
        });
        if ((exists.rows as any[]).length > 0) return NextResponse.json({ error: "الخدمة مضافة مسبقًا" }, { status: 409 });
        await db.execute({
          sql: `INSERT INTO provider_services (provider_id, remote_service_id, name, category, rate, min, max, type, markup_percent, sell_rate, is_active, is_new)
                VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
          args: [
            Number(providerId), String(target.service), String(target.name || ""), String(target.category || ""),
            costRate, Number(target.min) || 0, Number(target.max) || 0, String(target.type || ""),
            markupPct, sellRate,
          ],
        });
        return NextResponse.json({ ok: true, service: { ...target, markup_percent: markupPct, sell_rate: sellRate } });
      } catch (err: any) {
        return NextResponse.json({ error: "تعذر إضافة الخدمة: " + (err.message || "") }, { status: 502 });
      }
    }

    // 6-ج) تعديل اسم أي خدمة (ينطبق فورًا على كل المستخدمين)
    if (action === "rename-service") {
      const { id, name } = body;
      await db.execute({ sql: "UPDATE provider_services SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [String(name), Number(id)] });
      return NextResponse.json({ ok: true });
    }

    // 6-د) إزالة وسم "جديد" من خدمة
    if (action === "clear-new-badge") {
      const { id } = body;
      await db.execute({ sql: "UPDATE provider_services SET is_new = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [Number(id)] });
      return NextResponse.json({ ok: true });
    }

    // 7) تحديث هامش ربح خدمة
    if (action === "update-service") {
      const { id, markup_percent, is_active } = body;
      const svc = await db.execute({ sql: "SELECT rate, markup_percent FROM provider_services WHERE id = ?", args: [Number(id)] });
      const s = svc.rows[0] as any;
      if (!s) return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
      const markupPct = Number(markup_percent ?? s.markup_percent ?? DEFAULT_MARKUP);
      const sellRate = applyMarkup(Number(s.rate) || 0, markupPct);
      await db.execute({
        sql: `UPDATE provider_services SET markup_percent=?, sell_rate=?, is_active=${is_active !== undefined ? is_active : 1}, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        args: [markupPct, sellRate, Number(id)],
      });
      return NextResponse.json({ ok: true, sell_rate: sellRate });
    }

    // 8) تحديث هامش جميع خدمات المزود دفعة واحدة
    if (action === "update-provider-services") {
      const { providerId, markup_percent } = body;
      const markupPct = Number(markup_percent) || 0;
      await db.execute({
        sql: `UPDATE provider_services SET markup_percent=?, sell_rate = ROUND(rate * (1 + ? / 100), 3), updated_at=CURRENT_TIMESTAMP WHERE provider_id=?`,
        args: [markupPct, markupPct / 100, Number(providerId)],
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("Provider API error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
