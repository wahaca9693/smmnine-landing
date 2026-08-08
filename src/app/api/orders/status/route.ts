import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatus } from "@/lib/follower";

const statusMap: Record<string, string> = {
  Pending: "معلق",
  "In progress": "قيد التنفيذ",
  Processing: "قيد التنفيذ",
  Completed: "مكتمل",
  Complete: "مكتمل",
  Partial: "جزئي",
  Canceled: "ملغي",
  Cancelled: "ملغي",
  Cancel: "ملغي",
  Fail: "فاشل",
  Failed: "فاشل",
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
    const rawStatus = String(status.status || "").trim();
    // Normalize status casing
    const normalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

    await db.execute({
      sql: "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [normalizedStatus || rawStatus, orderId],
    });

    return NextResponse.json({
      ...status,
      status: normalizedStatus || rawStatus,
      status_ar: statusMap[normalizedStatus] || statusMap[rawStatus] || rawStatus,
    });
  } catch (err: any) {
    console.error("Order status error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
