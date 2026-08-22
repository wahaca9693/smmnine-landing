import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { invalidateServicesCache } from "@/lib/services-cache";
import { invalidateServiceCatalogCache } from "@/lib/service-catalog";
import {
  buildFallbackDescription,
  isOpaqueServiceText,
  translateServiceDescription,
  translateServiceName,
  translationFingerprint,
} from "@/lib/service-translation";

const DEFAULT_MARKUP = 0; // لا يوجد هامش تلقائي؛ يفعّله الأدمن صراحةً فقط
type JsonObject = Record<string, unknown>;
type SqlStatement = { sql: string; args: Array<string | number | null> };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidateProviderCatalogCaches(): void {
  invalidateServicesCache();
  invalidateServiceCatalogCache();
}

function authErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden" || message === "Account banned") return 403;
  return 500;
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function applyMarkup(rate: number, markup: number): number {
  return roundRate(rate * (1 + markup / 100));
}

function resolveSellRate(rate: number, markup: number, pricingMode?: string, manualPrice?: number): number {
  if (pricingMode === "manual") {
    const direct = Number(manualPrice);
    return Number.isFinite(direct) && direct >= 0 ? roundRate(direct) : applyMarkup(rate, markup);
  }
  return applyMarkup(rate, markup);
}

function serviceTextFromProvider(raw: JsonObject, remoteId: string): {
  name: string;
  description: string;
  nameAr: string;
  descriptionAr: string;
  sourceHash: string;
} {
  const category = String(raw.category ?? "").trim() || "عام";
  const type = String(raw.type ?? "").trim() || "service";
  const min = Number(raw.min) || 0;
  const max = Number(raw.max) || 0;
  const rawName = String(raw.name ?? raw.title ?? "").trim();
  // بعض المزودين يرسلون service ID في name أو نصًا فارغًا؛ لا نعرض المعرّف opaque للمستخدم.
  const name = isOpaqueServiceText(rawName)
    ? (category !== "عام" ? category : `Service ${remoteId}`)
    : rawName;
  const description = String(
    raw.description ?? raw.desc ?? raw.details ?? raw.service_description ?? "",
  ).trim() || buildFallbackDescription(name, category, type, min, max);
  return {
    name,
    description,
    nameAr: translateServiceName(name),
    descriptionAr: translateServiceDescription(description),
    sourceHash: translationFingerprint(name, description),
  };
}

function parsePricing(body: JsonObject, fallbackMarkup = DEFAULT_MARKUP, fallbackMode = "markup", fallbackManual: number | null = null) {
  const rawMarkup = body?.markup_percent;
  const markup = rawMarkup === undefined || rawMarkup === "" ? fallbackMarkup : Number(rawMarkup);
  const safeMarkup = Number.isFinite(markup) && markup >= 0 ? markup : fallbackMarkup;
  const mode = body?.pricing_mode === "manual" ? "manual" : (body?.pricing_mode === "markup" ? "markup" : fallbackMode);
  const rawManual = body?.manual_price;
  const manual = rawManual === undefined || rawManual === "" ? fallbackManual : Number(rawManual);
  const safeManual = manual !== null && Number.isFinite(manual) && manual >= 0 ? manual : null;
  return { markup: safeMarkup, mode, manual: safeManual, sellRate: resolveSellRate(0, safeMarkup, mode, safeManual ?? undefined) };
}

type ProviderProbe = { ok: boolean; balance?: string; error?: string; endpoint?: string };

type ProviderResponse = { response: Response; data: unknown; endpoint: string };

/**
 * يدعم الرابط الأساسي ورابط endpoint كاملًا، ويمنع الحالات الشائعة مثل
 * /api/v2/api/v2 أو وجود slash زائد في النهاية.
 */
function providerEndpointCandidates(input: string): string[] {
  const raw = String(input || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) {
    throw new Error("يجب أن يبدأ رابط المزود بـ http:// أو https://");
  }
  const origin = parsed.origin;
  const directPath = parsed.pathname.replace(/\/+$/, "");
  const basePath = directPath
    .replace(/(?:\/api\/v2(?:\/index\.php)?)$/i, "")
    .replace(/\/+$/, "");
  const direct = `${origin}${directPath || ""}`;
  const standard = `${origin}${basePath}/api/v2`;
  return [...new Set([direct, standard].filter((value) => value && value !== origin))];
}

function normalizeProviderBaseUrl(input: string): string {
  const raw = String(input || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) {
    throw new Error("رابط المزود غير صالح — استخدم عنوانًا يبدأ بـ https://");
  }
  const path = parsed.pathname
    .replace(/(?:\/api\/v2(?:\/index\.php)?)$/i, "")
    .replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

async function postProviderAction(apiUrl: string, apiKey: string, action: string, timeoutMs: number): Promise<ProviderResponse> {
  const body = new URLSearchParams({ key: apiKey, action });
  let last: ProviderResponse | null = null;
  let lastError: unknown = null;
  for (const endpoint of providerEndpointCandidates(apiUrl)) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
      const text = await response.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 240) }; }
      last = { response, data, endpoint };
      // 404 يعني أن هذه الصيغة ليست endpoint الصحيح؛ نجرب الصيغة البديلة فقط.
      if (response.status !== 404) return last;
    } catch (error) {
      lastError = error;
    }
  }
  if (last) return last;
  throw lastError instanceof Error ? lastError : new Error("تعذر الاتصال بالمزود");
}

function providerError(data: unknown, status: number): string {
  const record = isJsonObject(data) ? data : {};
  const message = String(record.error || record.message || "").trim();
  const lower = message.toLowerCase();
  if (status === 401 || lower.includes("invalid key") || lower.includes("invalid api key") || lower.includes("api key") || lower.includes("key is")) {
    return "مفتاح API غير صالح — تأكد من نسخه من لوحة المزود وأنه مفعّل";
  }
  if (status === 404) return "لم يُعثر على endpoint الخدمات. جرّب رابط اللوحة الأساسي أو الرابط المنتهي بـ /api/v2";
  if (status >= 400) return `المزود رفض الاتصال (HTTP ${status})${message ? `: ${message}` : ""}`;
  if (message) return message;
  return "استجابة غير مفهومة من المزود";
}

// اختبار الاتصال بالمزود عبر services فقط؛ لا ينشئ طلبًا ولا يخصم رصيدًا.
async function testProvider(apiUrl: string, apiKey: string, timeoutMs = 8000): Promise<ProviderProbe> {
  try {
    const { response, data, endpoint } = await postProviderAction(apiUrl, apiKey, "services", timeoutMs);
    const record = isJsonObject(data) ? data : {};
    if (!response.ok || record.error) return { ok: false, error: providerError(data, response.status), endpoint };
    if (Array.isArray(data)) return { ok: true, balance: `${data.length} خدمة`, endpoint };
    return { ok: false, error: "المزود استجاب، لكن تنسيق services غير قياسي — يجب أن يعيد قائمة JSON", endpoint };
  } catch (err: unknown) {
    const message = String(err instanceof Error ? err.message : "").toLowerCase();
    if (message.includes("timeout") || message.includes("aborted")) return { ok: false, error: "انتهت مهلة الاتصال بالمزود — تحقق من الرابط أو جدار الحماية" };
    if (message.includes("invalid url") || message.includes("url")) return { ok: false, error: "رابط API غير صالح — استخدم عنوانًا يبدأ بـ https://" };
    return { ok: false, error: "تعذر الوصول إلى المزود — تحقق من DNS وSSL والسماح بالاتصال الخارجي" };
  }
}

async function fetchProviderServices(apiUrl: string, apiKey: string): Promise<JsonObject[]> {
  const { response, data } = await postProviderAction(apiUrl, apiKey, "services", 20000);
  const record = isJsonObject(data) ? data : {};
  if (!response.ok || record.error) throw new Error(providerError(data, response.status));
  if (!Array.isArray(data)) throw new Error("استجابة services غير صالحة؛ يجب أن تكون قائمة JSON");
  return data.filter(isJsonObject);
}

async function fetchProviderBalance(apiUrl: string, apiKey: string): Promise<string> {
  try {
    const { response, data } = await postProviderAction(apiUrl, apiKey, "balance", 15000);
    const record = isJsonObject(data) ? data : {};
    if (response.ok && !record.error) return String(record.balance ?? record.remaining ?? "");
    return "غير متاح";
  } catch {
    return "غير متاح";
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    await initDb();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    if (mode === "service-stats") {
      const rows = await db.execute({
        sql: `SELECT provider_id, COUNT(*) AS total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS paused
              FROM provider_services GROUP BY provider_id`,
        args: [],
      });
      return NextResponse.json({ stats: rows.rows });
    }

    if (mode === "services") {
      const providerId = url.searchParams.get("providerId");
      const rawLimit = Number(url.searchParams.get("limit") || "0");
      const limit = rawLimit > 0 ? Math.min(rawLimit, 1000) : 0;
      const rawOffset = Math.max(0, Number(url.searchParams.get("offset") || "0"));
      const where = providerId ? "WHERE ps.provider_id = ?" : "";
      const args: (number | string)[] = providerId ? [Number(providerId)] : [];
      const paging = limit > 0 ? ` LIMIT ${limit} OFFSET ${rawOffset}` : "";
      const rows = await db.execute({
        sql: `SELECT ps.*, p.name AS provider_name FROM provider_services ps
              LEFT JOIN providers p ON p.id = ps.provider_id
              ${where}
              ORDER BY ps.provider_id, ps.remote_service_id${paging}`,
        args,
      });
      return NextResponse.json({ services: rows.rows, limit, offset: rawOffset });
    }

    // استعراض خدمات مزود من سيرفره الخارجي دون إدخالها (للمعاينة قبل الإضافة)
    if (mode === "preview") {
      const providerId = url.searchParams.get("providerId");
      const prov = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [Number(providerId)] });
      const p = prov.rows[0] as JsonObject | undefined;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      let services: JsonObject[] = [];
      let fetchError: string | null = null;
      try {
        services = await fetchProviderServices(String(p.api_url), String(p.api_key));
      } catch (err: unknown) {
        fetchError = err instanceof Error ? err.message : "";
      }
      // جلب الخدمات المضافة مسبقًا من هذا المزود لتحديد المضافة منها
      const existing = await db.execute({
        sql: "SELECT id, remote_service_id, name, category, rate, min, max, type, markup_percent, sell_rate, is_active, is_new FROM provider_services WHERE provider_id = ?",
        args: [Number(providerId)],
      });
      const localRows = existing.rows as JsonObject[];
      const added = new Set(localRows.map((r) => String(r.remote_service_id)));
      // إذا نجح الجلب من السيرفر نعرض خدماته؛ وإلا نعرض الخدمات المضافة محليًا (كي يعمل المزود عند تعذر الاتصال)
      const base = services.length > 0 ? services.map((s: JsonObject) => ({
        ...s,
        added: added.has(String(s.service)),
        category: String(s.category || ""),
        type: String(s.type || ""),
      })) : localRows.map((r) => ({
        service: r.remote_service_id,
        name: r.name,
        category: r.category,
        type: r.type,
        rate: Number(r.rate),
        min: Number(r.min),
        max: Number(r.max),
        added: true,
        is_active: Number(r.is_active) === 1,
        markup_percent: Number(r.markup_percent),
        sell_rate: Number(r.sell_rate),
        is_new: Number(r.is_new),
        local: true,
      }));
      return NextResponse.json({
        services: base,
        count: base.length,
        fetchError: fetchError ? "تعذر الاتصال بسيرفر المزود — تُعرض الخدمات المضافة محليًا فقط" : null,
        provider: { id: p.id, name: p.name },
      });
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

    const rows = await db.execute({
      sql: `SELECT id, name, api_url, balance, balance_fetched_at, notes, is_active,
                   connection_status, last_error, last_probe_at, created_at, updated_at
            FROM providers ORDER BY id DESC`,
      args: [],
    });
    return NextResponse.json({ providers: rows.rows });
  } catch (err: unknown) {
    const status = authErrorStatus(err);
    return NextResponse.json({ error: status >= 500 ? "تعذر تحميل بيانات المزودين حاليًا" : status === 401 ? "غير مصرح" : "ممنوع" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    await initDb();
    const body = (await request.json()) as JsonObject;
    const { action } = body;
    // 1) إضافة/تعديل مزود — حفظ محلي سريع، والفحص الخارجي مستقل عبر action=probe.
    if (action === "save") {
      const { id, name, api_url, api_key, notes } = body;
      if (!name || !api_url) {
        return NextResponse.json({ error: "اسم المزود والرابط مطلوبان" }, { status: 400 });
      }
      let normalizedUrl = "";
      try {
        normalizedUrl = normalizeProviderBaseUrl(String(api_url));
      } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "رابط API غير صالح" }, { status: 400 });
      }
      const incomingApiKey = String(api_key ?? "").trim();
      let resolvedApiKey = incomingApiKey;
      if (id && !resolvedApiKey) {
        const existing = await db.execute({ sql: "SELECT api_key FROM providers WHERE id = ?", args: [Number(id)] });
        const existingKey = existing.rows[0] as { api_key?: unknown } | undefined;
        resolvedApiKey = String(existingKey?.api_key ?? "").trim();
      }
      if (!resolvedApiKey) {
        return NextResponse.json({ error: "مفتاح API مطلوب عند إضافة مزود جديد" }, { status: 400 });
      }
      if (resolvedApiKey.length < 8) {
        return NextResponse.json({ error: "مفتاح API قصير جدًا — أدخل المفتاح الكامل من لوحة المزود" }, { status: 400 });
      }
      const trimmed = {
        name: String(name).trim(),
        api_url: normalizedUrl,
        api_key: resolvedApiKey,
        notes: notes ? String(notes).trim() : "",
      };
      let providerId: number;
      if (id) {
        await db.execute({
          sql: `UPDATE providers SET name=?, api_url=?, api_key=?, notes=?, connection_status='pending', last_error=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          args: [trimmed.name, trimmed.api_url, trimmed.api_key, trimmed.notes, Number(id)],
        });
        providerId = Number(id);
      } else {
        const r = await db.execute({
          sql: `INSERT INTO providers (name, api_url, api_key, notes, balance, connection_status, last_error) VALUES (?,?,?,?,?,?,?)`,
          args: [trimmed.name, trimmed.api_url, trimmed.api_key, trimmed.notes, "غير متاح", "pending", null],
        });
        providerId = Number(r.lastInsertRowid);
      }
      const saved = await db.execute({
        sql: `SELECT id, name, api_url, balance, balance_fetched_at, notes, is_active,
                     connection_status, last_error, last_probe_at, created_at, updated_at
              FROM providers WHERE id = ?`,
        args: [providerId],
      });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ provider: saved.rows[0], queued: true });
    }

    // فحص مستقل للاتصال؛ لا يمنع الحفظ أو ظهور البطاقة ولا يجلب الرصيد.
    if (action === "probe") {
      const providerId = Number(body.providerId ?? body.id);
      const row = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [providerId] });
      const p = row.rows[0] as JsonObject | undefined;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      const probe = await testProvider(String(p.api_url), String(p.api_key), 8000);
      const status = probe.ok ? "online" : "offline";
      await db.execute({
        sql: "UPDATE providers SET connection_status=?, last_error=?, last_probe_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        args: [status, probe.ok ? null : String(probe.error || "تعذر الاتصال"), providerId],
      });
      return NextResponse.json({ ok: probe.ok, providerId, connection_status: status, error: probe.error || null, endpoint: probe.endpoint || null }, { status: probe.ok ? 200 : 502 });
    }

    // 2) مزامنة خدمات المزود
    if (action === "sync") {
      const { providerId, markup } = body;
      const prov = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [Number(providerId)] });
      const p = prov.rows[0] as JsonObject | undefined;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      const services = await fetchProviderServices(String(p.api_url), String(p.api_key));
      const pricingEnabled = body?.pricing_enabled === true;
      const pricing = parsePricing({ markup_percent: markup }, pricingEnabled ? Number(p.markup_percent ?? DEFAULT_MARKUP) : 0);
      const markupPct = pricingEnabled ? pricing.markup : 0;
      // مزامنة غير مدمرة: لا نحذف الخدمات ولا نعيد ضبط الأسعار/الإخفاء اليدوي.
      const existingRows = await db.execute({
        sql: "SELECT id, remote_service_id, markup_percent, sell_rate, pricing_mode, manual_price, is_active, name FROM provider_services WHERE provider_id = ?",
        args: [Number(providerId)],
      });
      const existing = new Map((existingRows.rows as JsonObject[]).map((row) => [String(row.remote_service_id), row]));
      let inserted = 0;
      let updated = 0;
      const syncStatements: Array<{ sql: string; args: Array<string | number | null> }> = [];
      for (const s of services) {
        const remoteId = String(s.service);
        const current = existing.get(remoteId);
        const costRate = Number(s.rate) || 0;
        const text = serviceTextFromProvider(s, remoteId);
        if (current) {
          const keepManual = String(current.pricing_mode || "markup") === "manual";
          const sellRate = keepManual ? Number(current.manual_price ?? current.sell_rate ?? costRate) : (pricingEnabled ? applyMarkup(costRate, markupPct) : roundRate(costRate));
          syncStatements.push({
            sql: `UPDATE provider_services SET name=?, description=?, name_ar=?, description_ar=?, translation_source_hash=?, category=?, rate=?, min=?, max=?, type=?, sell_rate=?, is_new=0, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            args: [text.name, text.description, text.nameAr, text.descriptionAr, text.sourceHash, String(s.category || ""), costRate, Number(s.min) || 0, Number(s.max) || 0, String(s.type || ""), sellRate, Number(current.id)],
          });
          updated++;
        } else {
          const sellRate = pricingEnabled ? applyMarkup(costRate, markupPct) : roundRate(costRate);
          syncStatements.push({
            sql: `INSERT INTO provider_services (provider_id, remote_service_id, name, description, name_ar, description_ar, translation_source_hash, category, rate, min, max, type, markup_percent, sell_rate, pricing_mode, manual_price, is_new)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
            args: [Number(providerId), remoteId, text.name, text.description, text.nameAr, text.descriptionAr, text.sourceHash, String(s.category || ""), costRate, Number(s.min) || 0, Number(s.max) || 0, String(s.type || ""), markupPct, sellRate, "markup", null],
          });
          inserted++;
        }
      }
      for (let offset = 0; offset < syncStatements.length; offset += 100) {
        await db.batch(syncStatements.slice(offset, offset + 100), "write");
      }
      const balance = await fetchProviderBalance(String(p.api_url), String(p.api_key));
      await db.execute({
        sql: `UPDATE providers SET balance=?, balance_fetched_at=CURRENT_TIMESTAMP WHERE id=?`,
        args: [balance, Number(providerId)],
      });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ imported: inserted, updated, balance, services: inserted + updated });
    }

    // 3) تحديث رصيد جميع المزودين من سيرفراتهم الخارجية
    if (action === "refresh-balances") {
      const rows = await db.execute({ sql: "SELECT * FROM providers WHERE is_active = 1" });
      const providersToRefresh = rows.rows as JsonObject[];
      const updated: Array<{ id: number; name: string; balance: string }> = [];
      // تزامن محدود: يقلل زمن تحديث مئات المزودين دون فتح مئات الاتصالات دفعة واحدة.
      const concurrency = 4;
      for (let offset = 0; offset < providersToRefresh.length; offset += concurrency) {
        const batch = providersToRefresh.slice(offset, offset + concurrency);
        const batchResults = await Promise.all(batch.map(async (p) => {
          const providerId = Number(p.id);
          const balance = await fetchProviderBalance(String(p.api_url), String(p.api_key));
          // الحفاظ على آخر رصيد معروف بدلًا من الكتابة بـ"غير متاح" عند فشل الاتصال المؤقت
          const isUnavailable = balance === "غير متاح" || balance === "";
          const previousBalance = typeof p.balance === "string" ? p.balance : "";
          const knownBalance = previousBalance !== "غير متاح" && previousBalance !== "";
          const finalBalance = isUnavailable && knownBalance ? previousBalance : String(balance);
          const keepOldFetched = isUnavailable && knownBalance;
          await db.execute({
            sql: `UPDATE providers SET balance=?, balance_fetched_at=CURRENT_TIMESTAMP WHERE id=?`,
            args: [finalBalance, providerId],
          });
          if (keepOldFetched && p.balance_fetched_at) {
            await db.execute({
              sql: `UPDATE providers SET balance_fetched_at=? WHERE id=?`,
              args: [String(p.balance_fetched_at), providerId],
            });
          }
          return { id: providerId, name: String(p.name ?? ""), balance: finalBalance };
        }));
        updated.push(...batchResults);
      }
      return NextResponse.json({ ok: true, updated });
    }

    // 4) تفعيل/إيقاف مزود — تحديث محلي فوري مستقل عن حالة الاتصال الخارجي.
    if (action === "toggle") {
      const providerId = Number(body.id);
      await db.execute({
        sql: "UPDATE providers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [providerId],
      });
      const row = await db.execute({ sql: "SELECT id, is_active FROM providers WHERE id = ?", args: [providerId] });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true, provider: row.rows[0] || { id: providerId } });
    }

    // 5) حذف مزود
    if (action === "delete") {
      await db.execute({ sql: "DELETE FROM providers WHERE id = ?", args: [Number(body.id)] });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true });
    }

    // 6) حذف خدمة مزود (تخفى نهائيًا — تعود عند المزامنة التالية)
    if (action === "delete-service") {
      await db.execute({ sql: "DELETE FROM provider_services WHERE id = ?", args: [Number(body.id)] });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true });
    }

    // 6-ب) إضافة انتقائية لخدمة واحدة من مزود مربوط (مع وسم جديد + سعر عرض)
    if (action === "add-service") {
      const providerId = Number(body.provider_id ?? body.providerId);
      const { remote_service_id } = body;
      const prov = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [Number(providerId)] });
      const p = prov.rows[0] as JsonObject | undefined;
      if (!p) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      try {
        // إذا أرسلت الواجهة بيانات المعاينة، نحفظها مباشرة ولا نعيد استدعاء المزود لكل خدمة.
        const incoming = isJsonObject(body.service) ? body.service : null;
        let target: JsonObject | null = incoming;
        if (!target || String(target.service ?? target.remote_service_id) !== String(remote_service_id)) {
          const services = await fetchProviderServices(String(p.api_url), String(p.api_key));
          target = services.find((s: JsonObject) => String(s.service) === String(remote_service_id)) ?? null;
        }
        if (!target) return NextResponse.json({ error: "الخدمة غير موجودة لدى المزود" }, { status: 404 });
        const pricing = parsePricing(body, DEFAULT_MARKUP);
        const markupPct = pricing.markup;
        const costRate = Number.isFinite(Number(target.rate)) ? Number(target.rate) : 0;
        const sellRate = resolveSellRate(costRate, markupPct, pricing.mode, pricing.manual ?? undefined);
        const exists = await db.execute({
          sql: "SELECT id FROM provider_services WHERE provider_id = ? AND remote_service_id = ?",
          args: [Number(providerId), String(remote_service_id)],
        });
        if (exists.rows.length > 0) return NextResponse.json({ error: "الخدمة مضافة مسبقًا" }, { status: 409 });
        await db.execute({
          sql: `INSERT INTO provider_services (provider_id, remote_service_id, name, category, rate, min, max, type, markup_percent, sell_rate, pricing_mode, manual_price, is_active, is_new)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,1)`,
          args: [
            Number(providerId), String(target.service), String(target.name || ""), String(target.category || ""),
            costRate, Number(target.min) || 0, Number(target.max) || 0, String(target.type || ""),
            markupPct, sellRate, pricing.mode, pricing.manual,
          ],
        });
        const inserted = await db.execute({
          sql: `SELECT ps.id, ps.provider_id, p.name AS provider_name, ps.remote_service_id, ps.name, ps.category,
                       ps.rate, ps.min, ps.max, ps.type, ps.markup_percent, ps.sell_rate, ps.pricing_mode,
                       ps.manual_price, ps.is_active, ps.is_new
                FROM provider_services ps JOIN providers p ON p.id = ps.provider_id
                WHERE ps.provider_id = ? AND ps.remote_service_id = ? LIMIT 1`,
          args: [Number(providerId), String(target.service)],
        });
        invalidateProviderCatalogCaches();
        return NextResponse.json({ ok: true, service: (inserted.rows as JsonObject[])[0] || { ...target, provider_id: Number(providerId), remote_service_id: String(target.service), markup_percent: markupPct, sell_rate: sellRate, is_active: 1, is_new: 1 } });
      } catch (err: unknown) {
        return NextResponse.json({ error: "تعذر إضافة الخدمة: " + (err instanceof Error ? err.message : "") }, { status: 502 });
      }
    }

    // 6-ب-2) إضافة مجموعة خدمات من الكتالوج المعروض في دفعة واحدة
    if (action === "bulk-add-services") {
      const providerId = Number(body.provider_id ?? body.providerId);
      const incoming = Array.isArray(body.services) ? body.services : [];
      if (!Number.isInteger(providerId) || providerId <= 0) {
        return NextResponse.json({ error: "معرّف المزود غير صالح" }, { status: 400 });
      }
      if (incoming.length === 0) {
        return NextResponse.json({ error: "لم تُرسل أي خدمات للإضافة" }, { status: 400 });
      }
      if (incoming.length > 10000) {
        return NextResponse.json({ error: "الدفعة كبيرة جدًا — قسّم الخدمات إلى دفعات أصغر" }, { status: 413 });
      }
      const provider = await db.execute({ sql: "SELECT id FROM providers WHERE id = ?", args: [providerId] });
      if (!provider.rows.length) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });

      const existingRows = await db.execute({
        sql: "SELECT remote_service_id FROM provider_services WHERE provider_id = ?",
        args: [providerId],
      });
      const knownIds = new Set((existingRows.rows as JsonObject[]).map((row) => String(row.remote_service_id)));
      const pricingEnabled = body?.pricing_enabled === true;
      const pricing = parsePricing(body, pricingEnabled ? DEFAULT_MARKUP : 0);
      const markupPct = pricingEnabled ? pricing.markup : 0;
      const statements: SqlStatement[] = [];
      const insertedRemoteIds: string[] = [];
      let skipped = 0;
      let invalid = 0;

      for (const raw of incoming) {
        const remoteId = String(raw?.service ?? raw?.remote_service_id ?? raw?.id ?? "").trim();
        if (!remoteId || knownIds.has(remoteId)) {
          if (remoteId) skipped++;
          else invalid++;
          continue;
        }
        const rate = Number(raw?.rate);
        const min = Number(raw?.min);
        const max = Number(raw?.max);
        if (!Number.isFinite(rate) || rate < 0) {
          invalid++;
          continue;
        }
        const name = String(raw?.name ?? `Service ${remoteId}`).trim() || `Service ${remoteId}`;
        const category = String(raw?.category ?? "").trim();
        const type = String(raw?.type ?? "").trim();
        const sellRate = pricingEnabled ? resolveSellRate(rate, markupPct, pricing.mode, pricing.manual ?? undefined) : roundRate(rate);
        statements.push({
          sql: `INSERT INTO provider_services (provider_id, remote_service_id, name, category, rate, min, max, type, markup_percent, sell_rate, pricing_mode, manual_price, is_active, is_new)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,1)`,
          args: [providerId, remoteId, name, category, rate, Number.isFinite(min) ? min : 0, Number.isFinite(max) ? max : 0, type, markupPct, sellRate, pricing.mode, pricing.manual],
        });
        insertedRemoteIds.push(remoteId);
        knownIds.add(remoteId);
      }

      if (statements.length) await db.batch(statements, "write");
      let insertedServices: JsonObject[] = [];
      if (insertedRemoteIds.length) {
        const placeholders = insertedRemoteIds.map(() => "?").join(",");
        const insertedRows = await db.execute({
          sql: `SELECT ps.id, ps.provider_id, p.name AS provider_name, ps.remote_service_id, ps.name, ps.category,
                       ps.rate, ps.min, ps.max, ps.type, ps.markup_percent, ps.sell_rate, ps.pricing_mode,
                       ps.manual_price, ps.is_active, ps.is_new
                FROM provider_services ps JOIN providers p ON p.id = ps.provider_id
                WHERE ps.provider_id = ? AND ps.remote_service_id IN (${placeholders})
                ORDER BY ps.id ASC`,
          args: [providerId, ...insertedRemoteIds],
        });
        insertedServices = insertedRows.rows as JsonObject[];
      }
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true, added: statements.length, skipped, invalid, services: insertedServices });
    }

    // 6-ب-3) حذف مجموعة خدمات محددة أو كل خدمات مزود
    if (action === "delete-services") {
      const providerId = Number(body.provider_id ?? body.providerId);
      const ids = Array.isArray(body.ids) ? body.ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0) : [];
      if (!Number.isInteger(providerId) || providerId <= 0) return NextResponse.json({ error: "معرّف المزود غير صالح" }, { status: 400 });
      if (ids.length > 5000) return NextResponse.json({ error: "عدد الخدمات كبير جدًا — نفذ الحذف على دفعات" }, { status: 413 });
      if (ids.length === 0) {
        const result = await db.execute({ sql: "DELETE FROM provider_services WHERE provider_id = ?", args: [providerId] });
        invalidateProviderCatalogCaches();
        return NextResponse.json({ ok: true, deleted: Number((result as { rowsAffected?: number }).rowsAffected || 0), scope: "provider" });
      }
      const placeholders = ids.map(() => "?").join(",");
      const result = await db.execute({ sql: `DELETE FROM provider_services WHERE provider_id = ? AND id IN (${placeholders})`, args: [providerId, ...ids] });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true, deleted: Number((result as { rowsAffected?: number }).rowsAffected || 0), scope: "selected" });
    }

    // 6-ج) تعديل اسم أي خدمة (ينطبق فورًا على كل المستخدمين)
    if (action === "rename-service") {
      const { id, name } = body;
      await db.execute({ sql: "UPDATE provider_services SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [String(name), Number(id)] });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true });
    }

    // 6-د) إزالة وسم "جديد" من خدمة
    if (action === "clear-new-badge") {
      const { id } = body;
      await db.execute({ sql: "UPDATE provider_services SET is_new = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [Number(id)] });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true });
    }

    // 7) تحديث نسبة الربح أو سعر البيع المباشر لخدمة واحدة
    if (action === "update-service") {
      const { id, is_active } = body;
      const svc = await db.execute({ sql: "SELECT rate, markup_percent, pricing_mode, manual_price FROM provider_services WHERE id = ?", args: [Number(id)] });
      const s = svc.rows[0] as JsonObject | undefined;
      if (!s) return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
      const pricing = parsePricing(body, Number(s.markup_percent ?? DEFAULT_MARKUP), String(s.pricing_mode || "markup"), s.manual_price == null ? null : Number(s.manual_price));
      const sellRate = resolveSellRate(Number(s.rate) || 0, pricing.markup, pricing.mode, pricing.manual ?? undefined);
      await db.execute({
        sql: `UPDATE provider_services SET markup_percent=?, pricing_mode=?, manual_price=?, sell_rate=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        args: [pricing.markup, pricing.mode, pricing.mode === "manual" ? pricing.manual : null, sellRate, is_active === undefined ? Number(s.is_active ?? 1) : (Number(is_active) ? 1 : 0), Number(id)],
      });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true, pricing_mode: pricing.mode, manual_price: pricing.manual, sell_rate: sellRate });
    }

    // 8) تحديث نسبة أو سعر مباشر لنطاق صريح من خدمات المزود
    if (action === "update-provider-services") {
      const providerId = Number(body.providerId ?? body.provider_id);
      const pricing = parsePricing(body, 0);
      const requestedScope = String(body.scope || "provider");
      const scope = requestedScope === "selected" || requestedScope === "category" ? requestedScope : "provider";
      const ids = Array.isArray(body.ids)
        ? body.ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
        : [];
      const category = String(body.category || "").trim();
      if (!Number.isInteger(providerId) || providerId <= 0) return NextResponse.json({ error: "معرّف المزود غير صالح" }, { status: 400 });
      if (scope === "selected" && ids.length === 0) return NextResponse.json({ error: "حدد خدمة واحدة على الأقل أو اختر تطبيقًا على المزود كاملًا" }, { status: 400 });
      if (scope === "category" && !category) return NextResponse.json({ error: "حدد تصنيفًا أو منصة لتطبيق التسعير عليها" }, { status: 400 });
      if (ids.length > 5000) return NextResponse.json({ error: "عدد الخدمات كبير جدًا — نفّذ التحديث على دفعات أصغر" }, { status: 413 });
      if (pricing.mode === "manual" && pricing.manual === null) return NextResponse.json({ error: "أدخل سعر العرض المباشر" }, { status: 400 });
      const where = scope === "selected"
        ? `WHERE provider_id=? AND id IN (${ids.map(() => "?").join(",")})`
        : scope === "category"
          ? "WHERE provider_id=? AND (category=? OR type=?)"
          : "WHERE provider_id=?";
      const args = scope === "selected"
        ? [pricing.markup, pricing.mode, pricing.mode === "manual" ? pricing.manual : null, pricing.mode, pricing.manual ?? 0, pricing.markup, providerId, ...ids]
        : scope === "category"
          ? [pricing.markup, pricing.mode, pricing.mode === "manual" ? pricing.manual : null, pricing.mode, pricing.manual ?? 0, pricing.markup, providerId, category, category]
          : [pricing.markup, pricing.mode, pricing.mode === "manual" ? pricing.manual : null, pricing.mode, pricing.manual ?? 0, pricing.markup, providerId];
      const result = await db.execute({
        sql: `UPDATE provider_services SET markup_percent=?, pricing_mode=?, manual_price=?, sell_rate=CASE WHEN ? = 'manual' THEN ? ELSE ROUND(rate * (1 + ? / 100), 6) END, updated_at=CURRENT_TIMESTAMP ${where}`,
        args,
      });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true, updated: Number((result as { rowsAffected?: number }).rowsAffected || 0), scope, pricing_mode: pricing.mode, manual_price: pricing.manual });
    }

    // 9) إلغاء أي هامش أو سعر مباشر وإعادة كل الخدمات إلى تكلفة المزود
    if (action === "reset-provider-pricing") {
      const providerId = Number(body.providerId ?? body.provider_id);
      const requestedScope = String(body.scope || "provider");
      const scope = requestedScope === "selected" || requestedScope === "category" ? requestedScope : "provider";
      const ids = Array.isArray(body.ids)
        ? body.ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
        : [];
      const category = String(body.category || "").trim();
      if (!Number.isInteger(providerId) || providerId <= 0) return NextResponse.json({ error: "معرّف المزود غير صالح" }, { status: 400 });
      if (scope === "selected" && ids.length === 0) return NextResponse.json({ error: "حدد خدمات لإلغاء النسبة عنها" }, { status: 400 });
      if (scope === "category" && !category) return NextResponse.json({ error: "حدد تصنيفًا أو منصة لإلغاء التسعير عنها" }, { status: 400 });
      const where = scope === "selected"
        ? `WHERE provider_id=? AND id IN (${ids.map(() => "?").join(",")})`
        : scope === "category"
          ? "WHERE provider_id=? AND (category=? OR type=?)"
          : "WHERE provider_id=?";
      const args = scope === "selected" ? [providerId, ...ids] : scope === "category" ? [providerId, category, category] : [providerId];
      const result = await db.execute({ sql: `UPDATE provider_services SET markup_percent=0, pricing_mode='markup', manual_price=NULL, sell_rate=ROUND(rate, 6), updated_at=CURRENT_TIMESTAMP ${where}`, args });
      invalidateProviderCatalogCaches();
      return NextResponse.json({ ok: true, updated: Number((result as { rowsAffected?: number }).rowsAffected || 0), scope });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: unknown) {
    const status = authErrorStatus(err);
    if (status >= 500) console.error("Provider API error:", err);
    const message = err instanceof Error ? err.message : "حدث خطأ";
    return NextResponse.json({ error: message }, { status });
  }
}
