import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
  await db.execute({ sql: "UPDATE api_keys SET requests_count = requests_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?", args: [row.id] });
  return { userId: Number(row.user_id), keyId: Number(row.id) };
}

export async function GET(request: Request) {
  const resolved = await resolveApiKey(request);
  if (!resolved) return NextResponse.json({ error: "مفتاح API غير صالح أو غير نشط" }, { status: 401 });

  // حالة طلب محدد — GET /api/v2?key=...&order=123
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  if (orderId) {
    const o = await db.execute({ sql: "SELECT id, service_id, service_name, link, quantity, charge, status, created_at FROM orders WHERE id = ? AND user_id = ?", args: [Number(orderId), resolved.userId] });
    const row = o.rows[0] as any;
    if (!row) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    return NextResponse.json({ order: { id: row.id, service: row.service_id, name: row.service_name, link: row.link, quantity: Number(row.quantity), charge: Number(row.charge), status: row.status } });
  }

  // استرجاع الخدمات المتاحة للمستخدم (خدمات المزودين النشطين فقط)
  const prov = await db.execute(`SELECT id, name, category, rate, min, max, type, sell_rate FROM provider_services WHERE is_active = 1 ORDER BY id`);
  const rows = (prov.rows as any[]).map((s) => ({ ...s, source: "provider" }));
  return NextResponse.json({ services: rows, count: rows.length });
}

export async function POST(request: Request) {
  const resolved = await resolveApiKey(request);
  if (!resolved) return NextResponse.json({ error: "مفتاح API غير صالح أو غير نشط" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  // إلغاء طلب + استرجاع الرصيد إلى محفظة المستخدم
  if (body.action === "cancel") {
    const orderId = Number(body.id);
    if (!orderId) return NextResponse.json({ error: "يرجى إرسال رقم الطلب" }, { status: 400 });
    const orderRes = await db.execute({ sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?", args: [orderId, resolved.userId] });
    const order = orderRes.rows[0] as any;
    if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    if (String(order.status) !== "processing" && String(order.status) !== "pending") {
      return NextResponse.json({ error: "لا يمكن إلغاء طلب لم يعد قيد المعالجة" }, { status: 400 });
    }
    const charge = Number(order.charge) || 0;
    if (charge > 0) await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [charge, resolved.userId] });
    await db.execute({ sql: "UPDATE orders SET status = 'canceled' WHERE id = ?", args: [orderId] });
    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
      args: [resolved.userId, "api_cancel", charge, "completed", `إلغاء طلب عبر API #${orderId} — استرجاع الرصيد`],
    });
    return NextResponse.json({ message: "تم إلغاء الطلب واسترجاع الرصيد إلى محفظتك", refund: charge });
  }

  const { service, link, quantity } = body;
  if (!service || !link || !quantity) {
    return NextResponse.json({ error: "البيانات ناقصة: service, link, quantity" }, { status: 400 });
  }

  // جلب الخدمة من مزود نشط (نظام المزودين — الخصم من محفظة المستخدم مباشرة)
  const svcRes = await db.execute({
    sql: "SELECT * FROM provider_services WHERE is_active = 1 AND (CAST(id AS TEXT) = ? OR remote_service_id = ?)",
    args: [String(service), String(service)],
  });
  const svc = svcRes.rows[0] as any;
  if (!svc) {
    return NextResponse.json({ error: "الخدمة غير متوفرة أو غير نشطة" }, { status: 400 });
  }

  const sellRate = svc.sell_rate != null ? Number(svc.sell_rate) : Number(svc.rate) * (1 + (Number(svc.markup_percent) || 30) / 100);
  const cost = (Number(quantity) / 1000) * sellRate;

  const userRes = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [resolved.userId] });
  const user = userRes.rows[0] as any;
  if (!user || Number(user.balance) < cost) {
    return NextResponse.json({ error: "رصيد المحفظة غير كافٍ" }, { status: 400 });
  }

  // تسجيل الطلب — الخصم والمعالجة من محفظة المستخدم مباشرة
  await db.execute({ sql: "UPDATE users SET balance = balance - ? WHERE id = ?", args: [cost, resolved.userId] });
  let orderId: number;
  try {
    const order = await db.execute({
      sql: `INSERT INTO orders (user_id, service_id, service_name, link, quantity, charge, status)
            VALUES (?, ?, ?, ?, ?, ?, 'processing')`,
      args: [resolved.userId, svc.id, svc.name, link, quantity, cost],
    });
    orderId = Number((order as any).lastInsertRowid);
  } catch (err: any) {
    // فشل إنشاء الطلب: استرجاع الرصيد حتى لا يُخصم من المستخدم بدون طلب فعلي
    await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, resolved.userId] });
    throw err;
  }
  // سجل المزود للمعالجة الخارجية
  await db.execute({
    sql: "INSERT INTO provider_order_logs (local_order_id, provider_id, remote_order_id, status) VALUES (?, ?, NULL, 'pending')",
    args: [orderId, Number(svc.provider_id)],
  });
  // معاملة خصم واضحة في سجل المستخدم
  await db.execute({
    sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
    args: [resolved.userId, "api_order", -cost, "completed", `طلب عبر API: ${svc.name} — كمية ${quantity}`],
  });

  return NextResponse.json({
    order: orderId,
    link,
    charge: cost,
    status: "processing",
    rem: Number(user.balance) - cost,
  });
}
