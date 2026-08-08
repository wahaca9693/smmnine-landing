import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const TYPE_LABELS: Record<string, string> = {
  speed_up: "تسريع طلب",
  refill: "تعويض طلب",
  recharge_issue: "مشكلة في الشحن",
  cancel_order: "إلغاء طلب",
  other: "مشكلة أخرى",
  inquiry: "استفسار عام",
};

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    let sql = `SELECT t.*, u.username, u.email 
               FROM tickets t 
               JOIN users u ON t.user_id = u.id`;
    const args: any[] = [];

    if (status !== "all") {
      sql += " WHERE t.status = ?";
      args.push(status);
    }
    sql += " ORDER BY t.created_at DESC LIMIT 200";

    const result = await db.execute({ sql, args });

    const tickets = result.rows.map((row: any) => ({
      id: Number(row.id),
      userId: Number(row.user_id),
      username: row.username,
      email: row.email,
      type: row.type,
      typeLabel: TYPE_LABELS[row.type] || row.type,
      subject: row.subject,
      description: row.description,
      orderId: row.order_id,
      status: row.status,
      adminReply: row.admin_reply,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ tickets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { action, ticketId, reply, status } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "معرف التذكرة مطلوب" }, { status: 400 });
    }

    if (action === "reply") {
      if (!reply || String(reply).trim().length < 1) {
        return NextResponse.json({ error: "الرد مطلوب" }, { status: 400 });
      }

      await db.execute({
        sql: "UPDATE tickets SET admin_reply = ?, status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [String(reply).trim(), ticketId],
      });

      return NextResponse.json({ success: true, message: "تم الرد على التذكرة" });
    }

    if (action === "status") {
      if (!status) {
        return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
      }
      await db.execute({
        sql: "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [status, ticketId],
      });
      return NextResponse.json({ success: true, message: "تم تحديث الحالة" });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
