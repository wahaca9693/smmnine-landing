import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executeProviderOrder } from "@/lib/providers";

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
  const orderId = url.searchParams.get("order");
  if (orderId) {
    const result = await db.execute({
      sql: "SELECT id, service_id, service_name, link, quantity, charge, status, created_at FROM orders WHERE id = ? AND user_id = ?",
      args: [Number(orderId), resolved.userId],
    });
    const row = result.rows[0] as any;
    if (!row) return json({ error: "الطلب غير موجود" }, { status: 404 });
    return json({
      order: {
        id: row.id,
        service: row.service_id,
        name: row.service_name,
        link: row.link,
        quantity: Number(row.quantity),
        charge: Number(row.charge),
        status: row.status,
        created_at: row.created_at,
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
    if (!orderId) return json({ error: "يرجى إرسال رقم الطلب" }, { status: 400 });
    const orderResult = await db.execute({ sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?", args: [orderId, resolved.userId] });
    const order = orderResult.rows[0] as any;
    if (!order) return json({ error: "الطلب غير موجود" }, { status: 404 });
    if (String(order.status) !== "processing" && String(order.status) !== "pending") {
      return json({ error: "لا يمكن إلغاء طلب لم يعد قيد المعالجة" }, { status: 400 });
    }
    const charge = Number(order.charge) || 0;
    if (charge > 0) await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [charge, resolved.userId] });
    await db.execute({ sql: "UPDATE orders SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [orderId] });
    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
      args: [resolved.userId, "api_cancel", charge, "completed", `إلغاء طلب عبر API #${orderId} — استرجاع الرصيد`],
    });
    return json({ message: "تم إلغاء الطلب واسترجاع الرصيد إلى محفظتك", refund: charge });
  }

  const { service, link, quantity } = body;
  if (!service || !link || !quantity) {
    return json({ error: "البيانات ناقصة: service, link, quantity" }, { status: 400 });
  }
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

  const sellRate = svc.sell_rate != null
    ? Number(svc.sell_rate)
    : Number(svc.rate) * (1 + (Number(svc.markup_percent) || 30) / 100);
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
      sql: `INSERT INTO orders (user_id, service_id, service_name, link, quantity, charge, status)
            VALUES (?, ?, ?, ?, ?, ?, 'processing')`,
      args: [resolved.userId, svc.id, svc.name, String(link), qty, cost],
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
