import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshOrderStatus } from "@/lib/order-status-refresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const order = orderResult.rows[0] as Record<string, unknown> | undefined;
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    const status = await refreshOrderStatus({
      id: Number(order.id),
      user_id: Number(order.user_id),
      provider_id: order.provider_id,
      service_id: order.service_id,
      public_service_id: order.public_service_id,
      service_name: order.service_name,
      smmnine_order_id: order.smmnine_order_id,
      status: order.status,
      start_count: order.start_count,
      remains: order.remains,
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("Order status error:", error);
    const message = error instanceof Error ? error.message : "حدث خطأ أثناء تحديث حالة الطلب";
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (message === "Account banned") return NextResponse.json({ error: "Account banned" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
