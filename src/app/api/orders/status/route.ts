import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatus } from "@/lib/follower";
import { getProviderOrderStatus } from "@/lib/providers";
import { canRequestOrderCancellation, normalizeOrderStatus, orderStatusKey, orderStatusTranslationKey } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const orderResult = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?",
      args: [orderId, session.userId!],
    });

    const order = orderResult.rows[0] as any;
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    if (!order.smmnine_order_id) {
      return NextResponse.json({ error: "لم يُسجّل رقم الطلب لدى المزود بعد" }, { status: 409 });
    }

    const providerId = numericValue(order.provider_id);
    const status = providerId
      ? await getProviderOrderStatus(providerId, String(order.smmnine_order_id))
      : await getOrderStatus(String(order.smmnine_order_id));
    const normalizedStatus = normalizeOrderStatus(status.status);
    const statusKey = orderStatusKey(normalizedStatus);
    const startCount = numericValue(status.start_count ?? status.startCount);
    const remains = numericValue(status.remains ?? status.remaining);

    await db.execute({
      sql: `UPDATE orders
            SET status = ?, start_count = COALESCE(?, start_count), remains = COALESCE(?, remains), updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?`,
      args: [normalizedStatus, startCount, remains, orderId, session.userId!],
    });

    return NextResponse.json({
      ...status,
      status: normalizedStatus,
      status_key: statusKey,
      status_i18n_key: orderStatusTranslationKey(normalizedStatus),
      start_count: startCount ?? numericValue(order.start_count),
      remains: remains ?? numericValue(order.remains),
      can_cancel: canRequestOrderCancellation(normalizedStatus),
      cancel_rule: canRequestOrderCancellation(normalizedStatus)
        ? "يمكن طلب الإلغاء، ولا يُعاد الرصيد إلا بعد تأكيد المزود."
        : "لا يمكن إلغاء الطلب بعد بدء التنفيذ أو اكتماله.",
    });
  } catch (err: any) {
    console.error("Order status error:", err);
    if (err?.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err?.message === "Account banned") return NextResponse.json({ error: "Account banned" }, { status: 403 });
    return NextResponse.json({ error: err.message || "حدث خطأ أثناء تحديث حالة الطلب" }, { status: 500 });
  }
}
