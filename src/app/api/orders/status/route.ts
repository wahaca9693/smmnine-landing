import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatus } from "@/lib/follower";

const statusMap: Record<string, string> = {
  Pending: "قيد الانتظار",
  "In progress": "قيد التنفيذ",
  Completed: "مكتمل",
  Partial: "جزئي",
  Canceled: "ملغي",
  Cancel: "ملغي",
  Fail: "فاشل",
  Refunded: "مسترد",
};

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

    const order = orderResult.rows[0];
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const status = await getOrderStatus(String(order.smmnine_order_id));

    await db.execute({
      sql: "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [status.status, orderId],
    });

    return NextResponse.json({
      ...status,
      status_ar: statusMap[status.status] || status.status,
    });
  } catch (err: any) {
    console.error("Order status error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
