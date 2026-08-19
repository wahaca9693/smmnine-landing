import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelProviderOrder, executeProviderOrder, getProviderOrderStatus } from "@/lib/providers";
import { cancelOrder, getOrderStatus } from "@/lib/follower";
import { canRequestOrderCancellation, normalizeOrderStatus, orderStatusKey } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

function isConfirmedCancellation(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const value = record.cancel ?? record.cancelled ?? record.canceled ?? record.success;
  if (value === true || value === 1 || value === "1" || String(value || "").toLowerCase() === "true") return true;
  const status = String(record.status || "").toLowerCase();
  return ["cancel", "canceled", "cancelled", "success", "ok"].includes(status);
}

// بوابة API العامة SMM v2 — للمستخدمين (تستقبل key أو Bearer token)
async function resolveApiKey(request: Request): Promise<{ userId: number; keyId: number } | null> {
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const key = keyParam || bearer;
  if (!key) return null;
  const res = await db.execute({ sql: "SELECT id, user_id, is_active FROM api_keys WHERE api_key = ?", args: [key] });
  const row = res.rows[0] as any;
  if (!row || !Number(row.is_active)) return null;
  await db.execute({
    sql: "UPDATE api_keys SET requests_count = requests_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [row.id],
  });
  return { userId: Number(row.user_id), keyId: Number(row.id) };
}

export async function GET(request: Request) {
  const resolved = await resolveApiKey(request);
  if (!resolved) return json({ error: "مفتاح API غير صالح أو غير نشط" }, { status: 401 });

  const url = new URL(request.url);
  const rawOrderId = url.searchParams.get("order");
  const orderId = rawOrderId ? Number(rawOrderId) : null;
  if (rawOrderId && (!Number.isInteger(orderId) || Number(orderId) <= 0)) {
    return json({ error: "رقم الطلب غير صالح" }, { status: 400 });
  }
  if (orderId) {
    const result = await db.execute({
      sql: "SELECT id, service_id, service_name, link, quantity, charge, status, smmnine_order_id, provider_id, start_count, remains, cancel_requested_at, refunded_at, created_at, updated_at FROM orders WHERE id = ? AND user_id = ?",
      args: [Number(orderId), resolved.userId],
    });
    const row = result.rows[0] as any;
    if (!row) return json({ error: "الطلب غير موجود" }, { status: 404 });
    const normalizedStatus = normalizeOrderStatus(row.status);
    return json({
      order: {
        id: row.id,
        service: row.service_id,
        name: row.service_name,
        link: row.link,
        quantity: Number(row.quantity),
        charge: Number(row.charge),
        status: row.status,
        status_key: orderStatusKey(normalizedStatus),
        can_cancel: canRequestOrderCancellation(normalizedStatus) && !row.refunded_at,
        provider_order: row.smmnine_order_id ?? null,
        provider_id: row.provider_id == null ? null : Number(row.provider_id),
        start_count: row.start_count == null ? null : Number(row.start_count),
        remains: row.remains == null ? null : Number(row.remains),
        cancel_requested: Boolean(row.cancel_requested_at),
        refunded: Boolean(row.refunded_at),
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  }

  const servicesResult = await db.execute(`
    SELECT ps.id, ps.name, ps.category, ps.sell_rate AS rate, ps.min, ps.max, ps.type,
           ps.remote_service_id, ps.provider_id, p.name AS provider_name
    FROM provider_services ps
    JOIN providers p ON p.id = ps.provider_id
    WHERE p.is_active = 1 AND ps.is_active = 1
    ORDER BY ps.id
  `);
  const services = (servicesResult.rows as any[]).map((service) => ({ ...service, source: "provider" }));
  return json({ services, count: services.length });
}

export async function POST(request: Request) {
  const resolved = await resolveApiKey(request);
  if (!resolved) return json({ error: "مفتاح API غير صالح أو غير نشط" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  if (body.action === "cancel") {
    const orderId = Number(body.id);
    if (!Number.isInteger(orderId) || orderId <= 0) return json({ error: "يرجى إرسال رقم طلب صالح" }, { status: 400 });

    const orderResult = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      args: [orderId, resolved.userId],
    });
    const order = orderResult.rows[0] as any;
    if (!order) return json({ error: "الطلب غير موجود" }, { status: 404 });
    if (!order.smmnine_order_id) return json({ error: "لم يُسجّل الطلب لدى المزود بعد" }, { status: 409 });
    if (order.refunded_at) return json({ error: "تمت إعادة رصيد هذا الطلب مسبقًا" }, { status: 409 });

    const providerId = Number(order.provider_id) || null;
    const remoteStatus = providerId
      ? await getProviderOrderStatus(providerId, String(order.smmnine_order_id))
      : await getOrderStatus(String(order.smmnine_order_id));
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

    const batchResult = await db.batch([
      {
        sql: "UPDATE orders SET status = 'Canceled', refunded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND refunded_at IS NULL",
        args: [orderId, resolved.userId],
      },
      {
        sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
        args: [charge, resolved.userId],
      },
      {
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, 'refund', ?, 'completed', ?)",
        args: [resolved.userId, charge, `استرداد طلب API الملغى #${order.smmnine_order_id}`],
      },
    ], "write");
    if (Number((batchResult[0] as any)?.rowsAffected || 0) !== 1) {
      return json({ error: "تمت معالجة إلغاء الطلب مسبقًا أو تعذر تحديثه" }, { status: 409 });
    }

    return json({
      ok: true,
      status: "Canceled",
      status_key: "canceled",
      refunded_amount: charge,
      message: "تم إلغاء الطلب وإعادة رصيده إلى محفظتك بعد تأكيد المزود",
    });
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

  const serviceResult = await db.execute({
    sql: `SELECT ps.*, p.name AS provider_name
          FROM provider_services ps
          JOIN providers p ON p.id = ps.provider_id
          WHERE p.is_active = 1 AND ps.is_active = 1
            AND (CAST(ps.id AS TEXT) = ? OR ps.remote_service_id = ?)
          LIMIT 1`,
    args: [String(service), String(service)],
  });
  const svc = serviceResult.rows[0] as any;
  if (!svc) return json({ error: "الخدمة غير متوفرة أو غير نشطة" }, { status: 400 });

  const min = Number(svc.min) || 0;
  const max = Number(svc.max) || Number.MAX_SAFE_INTEGER;
  if (qty < min || qty > max) {
    return json({ error: `الكمية يجب أن تكون بين ${min} و ${max}` }, { status: 400 });
  }

  const storedMarkup = Number(svc.markup_percent);
  const safeMarkup = Number.isFinite(storedMarkup) && storedMarkup >= 0 ? storedMarkup : 0;
  const sellRate = svc.sell_rate != null
    ? Number(svc.sell_rate)
    : Number(svc.rate) * (1 + safeMarkup / 100);
  const cost = (qty / 1000) * sellRate;
  if (!Number.isFinite(cost) || cost < 0) return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });

  const userResult = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [resolved.userId] });
  const user = userResult.rows[0] as any;
  if (!user || Number(user.balance) < cost) {
    return json({ error: "رصيد المحفظة غير كافٍ" }, { status: 400 });
  }

  const debit = await db.execute({
    sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
    args: [cost, resolved.userId, cost],
  });
  if (Number((debit as any).rowsAffected || 0) !== 1) {
    return json({ error: "رصيد المحفظة غير كافٍ أو تغيّر أثناء المعالجة" }, { status: 409 });
  }

  let orderId: number;
  try {
    const order = await db.execute({
      sql: `INSERT INTO orders (user_id, provider_id, service_id, service_name, link, quantity, charge, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
      args: [resolved.userId, Number(svc.provider_id), svc.id, svc.name, String(link), qty, cost],
    });
    orderId = Number((order as any).lastInsertRowid);
    await db.execute({
      sql: "INSERT INTO provider_order_logs (local_order_id, provider_id, remote_order_id, status) VALUES (?, ?, NULL, 'pending')",
      args: [orderId, Number(svc.provider_id)],
    });
  } catch (error) {
    await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, resolved.userId] });
    throw error;
  }

  const providerOrder = await executeProviderOrder({
    providerId: Number(svc.provider_id),
    service: String(svc.remote_service_id),
    link: String(link),
    quantity: String(qty),
  });
  if (!providerOrder.ok || !providerOrder.remoteOrderId) {
    await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, resolved.userId] });
    await db.execute({ sql: "UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [orderId] });
    await db.execute({ sql: "UPDATE provider_order_logs SET status = 'failed', error = ? WHERE local_order_id = ?", args: [providerOrder.error || "فشل المزود", orderId] });
    return json({ error: `فشل إنشاء الطلب لدى المزود: ${providerOrder.error || "خطأ غير معروف"}` }, { status: 502 });
  }

  const remoteOrderId = providerOrder.remoteOrderId;
  await db.execute({
    sql: "UPDATE orders SET smmnine_order_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [remoteOrderId, orderId],
  });
  await db.execute({
    sql: "UPDATE provider_order_logs SET remote_order_id = ?, status = 'submitted' WHERE local_order_id = ?",
    args: [remoteOrderId, orderId],
  });
  await db.execute({
    sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
    args: [resolved.userId, "api_order", -cost, "completed", `طلب عبر API: ${svc.name} — كمية ${qty}`],
  });

  return json({
    order: orderId,
    link,
    charge: cost,
    status: "processing",
    rem: Number(user.balance) - cost,
    provider_order: remoteOrderId,
  });
}
