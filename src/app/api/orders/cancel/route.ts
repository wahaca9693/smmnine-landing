import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelOrder, getOrderStatus } from "@/lib/follower";
import { cancelProviderOrder, getProviderOrderStatus } from "@/lib/providers";
import { canRequestOrderCancellation, normalizeOrderStatus, orderStatusKey } from "@/lib/order-status";
import { resolveProviderId } from "@/lib/order-status-refresh";

type DbRow = Record<string, unknown>;
type CancelBody = { orderId?: unknown };

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isConfirmedCancellation(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const value = record.cancel ?? record.cancelled ?? record.canceled ?? record.success;
  if (value === true || value === 1 || value === "1" || String(value || "").toLowerCase() === "true") return true;
  const status = String(record.status || "").toLowerCase();
  return ["cancel", "canceled", "cancelled", "success", "ok"].includes(status);
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json() as CancelBody;
    const orderId = typeof body.orderId === "number" || typeof body.orderId === "string" ? body.orderId : null;
    if (!orderId) return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });

    const result = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      args: [orderId, session.userId!],
    });
    const order = result.rows[0] as DbRow | undefined;
    if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    if (!order.smmnine_order_id) return NextResponse.json({ error: "لم يُسجّل الطلب لدى المزود بعد" }, { status: 409 });
    if (order.refunded_at) return NextResponse.json({ error: "تمت إعادة رصيد هذا الطلب مسبقًا" }, { status: 409 });

    const providerId = await resolveProviderId({
      id: Number(order.id),
      user_id: Number(order.user_id),
      service_id: order.service_id,
      public_service_id: order.public_service_id,
      service_name: order.service_name,
      provider_id: order.provider_id,
      smmnine_order_id: order.smmnine_order_id,
      status: order.status,
      start_count: order.start_count,
      remains: order.remains,
    });
    const remoteStatus = providerId
      ? await getProviderOrderStatus(providerId, String(order.smmnine_order_id))
      : await getOrderStatus(String(order.smmnine_order_id));
    const normalizedStatus = normalizeOrderStatus(remoteStatus.status);
    if (!canRequestOrderCancellation(normalizedStatus)) {
      return NextResponse.json({
        error: "لا يمكن إلغاء الطلب بعد بدء التنفيذ أو اكتماله",
        status: normalizedStatus,
        status_key: orderStatusKey(normalizedStatus),
      }, { status: 409 });
    }

    await db.execute({
      sql: "UPDATE orders SET cancel_requested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      args: [orderId, session.userId!],
    });

    const cancellation = providerId
      ? await cancelProviderOrder(providerId, String(order.smmnine_order_id))
      : await cancelOrder(String(order.smmnine_order_id));
    if (!isConfirmedCancellation(cancellation)) {
      await db.execute({
        sql: "UPDATE orders SET cancel_requested_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        args: [orderId, session.userId!],
      });
      return NextResponse.json({
        error: "لم يؤكد المزود إلغاء الطلب؛ لم يتم إرجاع الرصيد",
        provider_response: cancellation,
      }, { status: 502 });
    }

    const charge = Number(order.charge || 0);
    if (!Number.isFinite(charge) || charge < 0) {
      return NextResponse.json({ error: "قيمة استرداد غير صالحة؛ راجع الدعم" }, { status: 500 });
    }

    const batchResult = await db.batch([
      {
        sql: `UPDATE orders
              SET status = 'Canceled', refunded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND user_id = ? AND refunded_at IS NULL`,
        args: [orderId, session.userId!],
      },
      {
        sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
        args: [charge, session.userId!],
      },
      {
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, 'refund', ?, 'completed', ?)",
        args: [session.userId!, charge, `استرداد الطلب الملغى #${order.smmnine_order_id}`],
      },
    ], "write");

    const updated = Number(batchResult[0]?.rowsAffected || 0);
    if (updated !== 1) {
      return NextResponse.json({ error: "تمت معالجة إلغاء الطلب مسبقًا أو تعذر تحديثه" }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      status: "Canceled",
      status_key: "canceled",
      refunded_amount: charge,
      message: "تم إلغاء الطلب وإعادة رصيده إلى محفظتك بعد تأكيد المزود",
    });
  } catch (error) {
    console.error("Order cancellation error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Account banned") return NextResponse.json({ error: "Account banned" }, { status: 403 });
    return NextResponse.json({ error: message || "تعذر إلغاء الطلب" }, { status: 500 });
  }
}
