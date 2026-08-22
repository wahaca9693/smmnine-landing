import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelProviderOrder, executeProviderOrder, getProviderOrderStatus } from "@/lib/providers";
import type { ProviderOrderResult } from "@/lib/providers";
import { cancelOrder, createOrder, getOrderStatus } from "@/lib/follower";
import { findCatalogService, findCatalogServiceByPublicId, getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";
import { canRequestOrderCancellation, normalizeOrderStatus, orderStatusKey } from "@/lib/order-status";
import { API_RATE_LIMIT, checkApiRateLimit, isApiV2Enabled } from "@/lib/api-v2-guard";
import { resolveApiKey } from "@/lib/api-key-cache";
import { getApiKeyPolicy, type ApiKeyPolicy } from "@/lib/api-key-policy";
import { refreshOrderStatus, resolveProviderId } from "@/lib/order-status-refresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonRecord = Record<string, unknown>;
type ApiResolution = { userId: number; keyId: number; policy: ApiKeyPolicy };

const pendingApiUsage = new Map<number, number>();
let usageFlushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleApiUsageFlush(): void {
  if (usageFlushTimer) return;
  usageFlushTimer = setTimeout(() => {
    usageFlushTimer = null;
    const batch = Array.from(pendingApiUsage.entries());
    pendingApiUsage.clear();
    void Promise.all(batch.map(([keyId, count]) => db.execute({
      sql: "UPDATE api_keys SET requests_count = requests_count + ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [count, keyId],
    }).catch(() => undefined))).then(() => {
      if (pendingApiUsage.size > 0) scheduleApiUsageFlush();
    });
  }, 1000);
}

function recordApiKeyUsage(keyId: number): void {
  pendingApiUsage.set(keyId, (pendingApiUsage.get(keyId) ?? 0) + 1);
  scheduleApiUsageFlush();
}

function idempotencyKey(request: Request, body: JsonRecord): string | null {
  const raw = request.headers.get("idempotency-key") || body.idempotency_key || body.client_order_id;
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim();
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(value)) throw new Error("مفتاح idempotency غير صالح؛ استخدم 8 إلى 128 حرفًا من A-Z أو 0-9 أو :_- ");
  return value;
}

async function authorizeApi(request: Request): Promise<ApiResolution | NextResponse> {
  const resolved = await resolveApiKeyFromRequest(request);
  if (!resolved) return json({ error: "مفتاح API غير صالح أو غير نشط" }, { status: 401 });

  try {
    if (!(await isApiV2Enabled())) {
      return json({ error: "واجهة API v2 متوقفة مؤقتًا من الإدارة" }, { status: 503, headers: { "Retry-After": "60" } });
    }
  } catch {
    return json({ error: "تعذر التحقق من حالة واجهة API حاليًا" }, { status: 503, headers: { "Retry-After": "30" } });
  }

  const policy = await getApiKeyPolicy(resolved.keyId);
  const rate = checkApiRateLimit(resolved.keyId, policy.customRateLimit);
  const rateHeaders = {
    "X-RateLimit-Limit": String(policy.customRateLimit || API_RATE_LIMIT),
    "X-RateLimit-Remaining": String(rate.remaining),
  };
  if (!rate.allowed) {
    return json({ error: "تم تجاوز حد طلبات API مؤقتًا", retry_after: rate.retryAfter }, {
      status: 429,
      headers: { ...rateHeaders, "Retry-After": String(rate.retryAfter) },
    });
  }
  return { ...resolved, policy };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

async function publicServiceIdForOrder(row: JsonRecord): Promise<string | null> {
  const stored = String(row.public_service_id ?? "").trim();
  if (/^svc_[a-f0-9]{20}$/.test(stored)) return stored;
  const serviceId = String(row.service_id ?? "").trim();
  const providerId = Number(row.provider_id);
  const catalog = await loadServiceCatalog().catch(() => []);
  const matched = catalog.find((service) => providerId > 0
    ? service.providerId === providerId && String(service.providerServiceId ?? "") === serviceId
    : service.source === "follower" && service.remoteServiceId === serviceId);
  return matched ? getPublicServiceId(matched) : null;
}

function isConfirmedCancellation(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const value = record.cancel ?? record.cancelled ?? record.canceled ?? record.success;
  if (value === true || value === 1 || value === "1" || String(value || "").toLowerCase() === "true") return true;
  const status = String(record.status || "").toLowerCase();
  return ["cancel", "canceled", "cancelled", "success", "ok"].includes(status);
}

async function refundFailedOrder(orderId: number, userId: number, charge: number, error: string): Promise<boolean> {
  const transaction = await db.transaction("write");
  try {
    const claim = await transaction.execute({
      sql: "UPDATE orders SET status = 'failed', refunded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND refunded_at IS NULL",
      args: [orderId, userId],
    });
    if (Number(claim.rowsAffected || 0) !== 1) {
      await transaction.rollback();
      return false;
    }
    await transaction.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [charge, userId] });
    await transaction.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, 'api_refund', ?, 'completed', ?)",
      args: [userId, charge, `استرداد طلب API الفاشل #${orderId}`],
    });
    await transaction.execute({
      sql: "UPDATE provider_order_logs SET status = 'failed', error = ? WHERE local_order_id = ?",
      args: [error.slice(0, 500), orderId],
    });
    await transaction.commit();
    return true;
  } catch {
    await transaction.rollback().catch(() => undefined);
    return false;
  }
}

// بوابة API العامة SMM v2 — للمستخدمين (تستقبل key أو Bearer token)
async function resolveApiKeyFromRequest(request: Request): Promise<{ userId: number; keyId: number } | null> {
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const key = keyParam || bearer;
  if (!key) return null;
  const resolved = await resolveApiKey(String(key));
  if (!resolved) return null;
  recordApiKeyUsage(resolved.keyId);
  return resolved;
}

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (authorization instanceof NextResponse) return authorization;
  const resolved = authorization;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (action === "info" || action === "capabilities") {
    return json({
      api_version: "v2",
      service_id_format: "svc_<20 lowercase hex>",
      wallet_scope: "authenticated_user_only",
      rate_limit: {
        limit_per_minute: resolved.policy.customRateLimit || API_RATE_LIMIT,
        remaining: checkApiRateLimit(resolved.keyId, resolved.policy.customRateLimit).remaining,
      },
      permissions: {
        catalog: resolved.policy.allowCatalog,
        balance: resolved.policy.allowBalance,
        order_status: resolved.policy.allowOrderStatus,
        order_create: resolved.policy.allowOrderCreate,
        order_cancel: resolved.policy.allowOrderCancel,
      },
      hidden_services_count: resolved.policy.hiddenServices.length,
      idempotency: "supported_for_order_creation",
    });
  }
  if (action === "balance") {
    if (!resolved.policy.allowBalance) return json({ error: "صلاحية الرصيد غير مفعّلة لهذا المفتاح" }, { status: 403 });
    const balanceResult = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [resolved.userId] });
    const balance = Number((balanceResult.rows[0] as unknown as JsonRecord | undefined)?.balance ?? 0);
    return json({ balance: Number.isFinite(balance) ? balance : 0, currency: "USD" });
  }
  const rawOrderId = url.searchParams.get("order");
  const orderId = rawOrderId ? Number(rawOrderId) : null;
  if (rawOrderId && (!Number.isInteger(orderId) || Number(orderId) <= 0)) {
    return json({ error: "رقم الطلب غير صالح" }, { status: 400 });
  }
  if (orderId) {
    if (!resolved.policy.allowOrderStatus) return json({ error: "صلاحية متابعة الطلبات غير مفعّلة لهذا المفتاح" }, { status: 403 });
    const result = await db.execute({
      sql: "SELECT id, service_id, public_service_id, service_name, link, quantity, charge, status, smmnine_order_id, provider_id, start_count, remains, cancel_requested_at, refunded_at, created_at, updated_at FROM orders WHERE id = ? AND user_id = ?",
      args: [Number(orderId), resolved.userId],
    });
    const row = result.rows[0] as unknown as JsonRecord | undefined;
    if (!row) return json({ error: "الطلب غير موجود" }, { status: 404 });
    let liveStatus: JsonRecord | null = null;
    let refreshError: string | null = null;
    try {
      liveStatus = await refreshOrderStatus({
        id: Number(row.id),
        user_id: resolved.userId,
        service_id: row.service_id,
        public_service_id: row.public_service_id,
        service_name: row.service_name,
        provider_id: row.provider_id,
        smmnine_order_id: row.smmnine_order_id,
        status: row.status,
        start_count: row.start_count,
        remains: row.remains,
      });
    } catch (error: unknown) {
      refreshError = error instanceof Error ? error.message : "تعذر تحديث الحالة من المزود";
    }
    const effectiveStatus = liveStatus?.status ?? row.status;
    const normalizedStatus = normalizeOrderStatus(effectiveStatus);
    return json({
      order: {
        id: row.id,
        service: await publicServiceIdForOrder(row),
        name: row.service_name,
        link: row.link,
        quantity: Number(row.quantity),
        charge: Number(row.charge),
        status: effectiveStatus,
        status_key: orderStatusKey(normalizedStatus),
        can_cancel: canRequestOrderCancellation(normalizedStatus) && !row.refunded_at,
        start_count: liveStatus?.start_count ?? (row.start_count == null ? null : Number(row.start_count)),
        remains: liveStatus?.remains ?? (row.remains == null ? null : Number(row.remains)),
        cancel_requested: Boolean(row.cancel_requested_at),
        refunded: Boolean(row.refunded_at),
        created_at: row.created_at,
        updated_at: row.updated_at,
        live: Boolean(liveStatus),
        refresh_error: refreshError,
      },
    });
  }

  const limitValue = Number(url.searchParams.get("limit") ?? "100");
  const pageValue = Number(url.searchParams.get("page") ?? "1");
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 500) : 100;
  const page = Number.isInteger(pageValue) ? Math.max(pageValue, 1) : 1;
  if (!resolved.policy.allowCatalog) return json({ error: "صلاحية كتالوج الخدمات غير مفعّلة لهذا المفتاح" }, { status: 403 });
  const catalog = (await loadServiceCatalog()).filter((service) => !resolved.policy.hiddenServices.includes(getPublicServiceId(service)));
  const start = (page - 1) * limit;
  const pageItems = catalog.slice(start, start + limit);
  const services = pageItems.map((service) => ({
    service: getPublicServiceId(service),
    name: service.name,
    name_ar: service.nameAr,
    description: service.description,
    description_ar: service.descriptionAr,
    category: service.category,
    category_ar: service.category,
    type: service.type,
    rate: service.rate,
    min: service.min,
    max: service.max,
  }));
  return json({
    services,
    count: services.length,
    total: catalog.length,
    page,
    limit,
    has_more: start + services.length < catalog.length,
  });
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (authorization instanceof NextResponse) return authorization;
  const resolved = authorization;

  const body = asRecord(await request.json().catch(() => ({})));

  if (body.action === "cancel") {
    if (!resolved.policy.allowOrderCancel) return json({ error: "صلاحية إلغاء الطلبات غير مفعّلة لهذا المفتاح" }, { status: 403 });
    const orderId = Number(body.id);
    if (!Number.isInteger(orderId) || orderId <= 0) return json({ error: "يرجى إرسال رقم طلب صالح" }, { status: 400 });

    const orderResult = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      args: [orderId, resolved.userId],
    });
    const order = orderResult.rows[0] as unknown as JsonRecord | undefined;
    if (!order) return json({ error: "الطلب غير موجود" }, { status: 404 });
    if (!order.smmnine_order_id) return json({ error: "لم يُسجّل الطلب لدى المزود بعد" }, { status: 409 });
    if (order.refunded_at) return json({ error: "تمت إعادة رصيد هذا الطلب مسبقًا" }, { status: 409 });

    if (order.cancel_requested_at) return json({ error: "طلب الإلغاء قيد المعالجة؛ لا تعاود الإرسال الآن" }, { status: 409, headers: { "Retry-After": "30" } });

    const providerId = await resolveProviderId({
      id: Number(order.id),
      user_id: resolved.userId,
      service_id: order.service_id,
      public_service_id: order.public_service_id,
      service_name: order.service_name,
      provider_id: order.provider_id,
      smmnine_order_id: order.smmnine_order_id,
      status: order.status,
      start_count: order.start_count,
      remains: order.remains,
    });
    let remoteStatus: JsonRecord;
    try {
      remoteStatus = asRecord(providerId
        ? await getProviderOrderStatus(providerId, String(order.smmnine_order_id))
        : await getOrderStatus(String(order.smmnine_order_id)));
    } catch {
      return json({ error: "تعذر التحقق من حالة الطلب لدى المزود؛ لم يتم إرسال طلب إلغاء" }, { status: 502, headers: { "Retry-After": "30" } });
    }
    const normalizedStatus = normalizeOrderStatus(remoteStatus.status);
    if (!canRequestOrderCancellation(normalizedStatus)) {
      return json({
        error: "لا يمكن إلغاء الطلب بعد بدء التنفيذ أو اكتماله",
        status: normalizedStatus,
        status_key: orderStatusKey(normalizedStatus),
      }, { status: 409 });
    }

    await db.execute({
      sql: "UPDATE orders SET cancel_requested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND refunded_at IS NULL",
      args: [orderId, resolved.userId],
    });

    const cancellation = providerId
      ? await cancelProviderOrder(providerId, String(order.smmnine_order_id))
      : await cancelOrder(String(order.smmnine_order_id));
    if (!isConfirmedCancellation(cancellation)) {
      await db.execute({
        sql: "UPDATE orders SET cancel_requested_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        args: [orderId, resolved.userId],
      });
      return json({ error: "لم يؤكد المزود إلغاء الطلب؛ لم يتم إرجاع الرصيد" }, { status: 502 });
    }

    const charge = Number(order.charge || 0);
    if (!Number.isFinite(charge) || charge < 0) return json({ error: "قيمة الاسترداد غير صالحة؛ راجع الدعم" }, { status: 500 });

    const transaction = await db.transaction("write");
    try {
      const claim = await transaction.execute({
        sql: "UPDATE orders SET status = 'Canceled', refunded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND refunded_at IS NULL",
        args: [orderId, resolved.userId],
      });
      if (Number(claim.rowsAffected || 0) !== 1) {
        throw new Error("REFUND_ALREADY_PROCESSED");
      }
      await transaction.execute({
        sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
        args: [charge, resolved.userId],
      });
      await transaction.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, 'refund', ?, 'completed', ?)",
        args: [resolved.userId, charge, `استرداد طلب API الملغى #${order.smmnine_order_id}`],
      });
      await transaction.commit();
    } catch (error: unknown) {
      await transaction.rollback().catch(() => undefined);
      if (error instanceof Error && error.message === "REFUND_ALREADY_PROCESSED") {
        return json({ error: "تمت معالجة إلغاء الطلب مسبقًا أو تعذر تحديثه" }, { status: 409 });
      }
      return json({ error: "تعذر تثبيت الاسترداد؛ لم يتم تغيير حالة الطلب" }, { status: 500 });
    }

    return json({
      ok: true,
      status: "Canceled",
      status_key: "canceled",
      refunded_amount: charge,
      message: "تم إلغاء الطلب وإعادة رصيده إلى محفظتك بعد تأكيد المزود",
    });
  }

  if (!resolved.policy.allowOrderCreate) return json({ error: "صلاحية إنشاء الطلبات غير مفعّلة لهذا المفتاح" }, { status: 403 });

  let requestIdempotencyKey: string | null = null;
  try {
    requestIdempotencyKey = idempotencyKey(request, body);
  } catch (error: unknown) {
    return json({ error: error instanceof Error ? error.message : "مفتاح idempotency غير صالح" }, { status: 400 });
  }
  if (requestIdempotencyKey) {
    const existingResult = await db.execute({
      sql: `SELECT id, smmnine_order_id, service_name, charge, status, link, quantity
            FROM orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1`,
      args: [resolved.userId, requestIdempotencyKey],
    });
    const existing = existingResult.rows[0] as unknown as JsonRecord | undefined;
    if (existing) {
      return json({
        replayed: true,
        order: {
          id: Number(existing.id),
          service_name: existing.service_name,
          charge: Number(existing.charge),
          status: existing.status,
          link: existing.link,
          quantity: Number(existing.quantity),
        },
      });
    }
  }

  const service = String(body?.service ?? "").trim();
  const link = String(body?.link ?? "").trim();
  const quantity = body?.quantity;
  if (!service || !link || quantity === undefined || quantity === null || quantity === "") {
    return json({ error: "البيانات ناقصة: service, link, quantity" }, { status: 400 });
  }
  if (service.length > 128) return json({ error: "معرّف الخدمة غير صالح" }, { status: 400 });
  if (link.length > 2048) return json({ error: "الرابط طويل جدًا" }, { status: 400 });
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return json({ error: "الكمية يجب أن تكون رقمًا صحيحًا موجبًا" }, { status: 400 });
  }

  const svc = await findCatalogServiceByPublicId(service) ?? await findCatalogService(service);
  if (!svc) {
    const ambiguous = !service.startsWith("provider:") && (await loadServiceCatalog())
      .filter((item) => item.remoteServiceId === service).length > 1;
    if (ambiguous) {
      return json({ error: "معرّف الخدمة غير فريد؛ استخدم المعرّف العام الظاهر بصيغة svc_<id>" }, { status: 409 });
    }
    return json({ error: "الخدمة غير متوفرة أو غير نشطة" }, { status: 400 });
  }

  const publicServiceId = getPublicServiceId(svc);
  if (resolved.policy.hiddenServices.includes(publicServiceId)) {
    return json({ error: "الخدمة غير متوفرة أو غير نشطة" }, { status: 400 });
  }

  const min = svc.min || 0;
  const max = svc.max || Number.MAX_SAFE_INTEGER;
  if (qty < min || qty > max) {
    return json({ error: `الكمية يجب أن تكون بين ${min} و ${max}` }, { status: 400 });
  }

  const sellRate = Number(svc.rate);
  const cost = (qty / 1000) * sellRate;
  if (!Number.isFinite(cost) || cost < 0) return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });

  if (svc.source === "follower" && (!Number.isInteger(Number(svc.remoteServiceId)) || Number(svc.remoteServiceId) <= 0)) {
    return json({ error: "معرّف خدمة follower غير مدعوم حاليًا" }, { status: 400 });
  }

  let orderId = 0;
  let transaction: Awaited<ReturnType<typeof db.transaction>> | null = null;
  try {
    transaction = await db.transaction("write");
    const debit = await transaction.execute({
      sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
      args: [cost, resolved.userId, cost],
    });
    if (Number(debit.rowsAffected || 0) !== 1) {
      await transaction.rollback();
      return json({ error: "رصيد المحفظة غير كافٍ أو تغيّر أثناء المعالجة" }, { status: 409 });
    }

    const order = await transaction.execute({
      sql: `INSERT INTO orders (user_id, provider_id, service_id, public_service_id, service_name, link, quantity, charge, status, idempotency_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?)`,
      args: [resolved.userId, svc.providerId, svc.providerServiceId ?? Number(svc.remoteServiceId), getPublicServiceId(svc), String(svc.name), String(link), qty, cost, requestIdempotencyKey],
    });
    orderId = Number(order.lastInsertRowid);
    await transaction.execute({
      sql: "INSERT INTO provider_order_logs (local_order_id, provider_id, remote_order_id, status) VALUES (?, ?, NULL, 'pending')",
      args: [orderId, svc.providerId],
    });
    await transaction.commit();
    transaction = null;
  } catch (error: unknown) {
    await transaction?.rollback().catch(() => undefined);
    if (requestIdempotencyKey) {
      const existingResult = await db.execute({
        sql: "SELECT id, service_id, public_service_id, smmnine_order_id, service_name, charge, status, link, quantity, provider_id FROM orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
        args: [resolved.userId, requestIdempotencyKey],
      });
      const existing = existingResult.rows[0] as unknown as JsonRecord | undefined;
      if (existing) {
        return json({
          replayed: true,
          order: {
            id: Number(existing.id),
            service: await publicServiceIdForOrder(existing),
            service_name: existing.service_name,
            charge: Number(existing.charge),
            status: existing.status,
            link: existing.link,
            quantity: Number(existing.quantity),
          },
        });
      }
    }
    throw error;
  }

  const providerOrder: ProviderOrderResult = svc.source === "provider"
    ? await executeProviderOrder({
      providerId: Number(svc.providerId),
      service: String(svc.remoteServiceId),
      link: String(link),
      quantity: String(qty),
    })
    : await createOrder(String(svc.remoteServiceId), String(link), String(qty))
      .then((data) => {
        const remoteOrderId = data.order ?? data.id;
        return remoteOrderId === undefined || remoteOrderId === null || String(remoteOrderId) === ""
          ? { ok: false, error: String(data.error ?? "استجابة غير صالحة من مزود follower") }
          : { ok: true, remoteOrderId: String(remoteOrderId) };
      })
      .catch((error: unknown) => ({
        ok: false,
        error: error instanceof Error ? error.message : "تعذر إرسال الطلب لمزود follower",
      }));
  if (!providerOrder.ok || !providerOrder.remoteOrderId) {
    const providerError = providerOrder.error || "فشل المزود";
    const refunded = await refundFailedOrder(orderId, resolved.userId, cost, providerError);
    if (!refunded) {
      return json({ error: "فشل المزود وتعذر تثبيت الاسترداد تلقائيًا؛ أوقف إعادة الإرسال وراجع الدعم", order: orderId, reconciliation_required: true }, { status: 503 });
    }
    return json({ error: "فشل إنشاء الطلب لدى الخدمة وتمت إعادة الرصيد إلى محفظتك", error_code: "UPSTREAM_ORDER_FAILED", refunded: true }, { status: 502 });
  }

  const remoteOrderId = providerOrder.remoteOrderId;
  try {
    await db.batch([
      {
        sql: "UPDATE orders SET smmnine_order_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [remoteOrderId, orderId],
      },
      {
        sql: "UPDATE provider_order_logs SET remote_order_id = ?, status = 'submitted', error = NULL WHERE local_order_id = ?",
        args: [remoteOrderId, orderId],
      },
      {
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
        args: [resolved.userId, "api_order", -cost, "completed", `طلب عبر API: ${svc.name} — كمية ${qty}`],
      },
    ], "write");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تثبيت الطلب محليًا";
    await db.execute({
      sql: "UPDATE orders SET smmnine_order_id = ?, status = 'reconciliation_required', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [remoteOrderId, orderId],
    }).catch(() => undefined);
    await db.execute({
      sql: "UPDATE provider_order_logs SET remote_order_id = ?, status = 'reconciliation_required', error = ? WHERE local_order_id = ?",
      args: [remoteOrderId, message.slice(0, 500), orderId],
    }).catch(() => undefined);
    return json({
      error: "قبل المزود الطلب، لكن تعذر تثبيته محليًا؛ لا تعاود الإرسال بنفس الطلب",
      order: orderId,
      reconciliation_required: true,
    }, { status: 503 });
  }

  const balanceResult = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [resolved.userId] });
  const currentBalance = Number((balanceResult.rows[0] as unknown as JsonRecord | undefined)?.balance || 0);
  return json({
    order: orderId,
    link,
    charge: cost,
    status: "processing",
    rem: Number.isFinite(currentBalance) ? currentBalance : 0,
    idempotency_key: requestIdempotencyKey,
  });
}
