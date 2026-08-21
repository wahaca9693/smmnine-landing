import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type DbRow = Record<string, unknown>;
type AdminTicketBody = { action?: unknown; ticketId?: unknown; reply?: unknown; status?: unknown };

const VALID_STATUSES = new Set(["open", "pending", "in_progress", "resolved", "closed"]);

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
    const args: Array<string | number> = [];

    if (status !== "all") {
      sql += " WHERE t.status = ?";
      args.push(status);
    }
    sql += " ORDER BY t.created_at DESC LIMIT 200";

    const result = await db.execute({ sql, args });

    const tickets = result.rows.map((row) => {
      const item = row as DbRow;
      const type = String(item.type || "other");
      return {
        id: Number(item.id),
        userId: Number(item.user_id),
        username: item.username,
        email: item.email,
        type,
        typeLabel: TYPE_LABELS[type] || type,
        subject: item.subject,
        description: item.description,
        orderId: item.order_id,
        status: item.status,
        adminReply: item.admin_reply,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" || message === "Account banned" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل التذاكر" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as AdminTicketBody;
    const action = typeof body.action === "string" ? body.action : "";
    const ticketId = Number(body.ticketId || 0);
    const reply = typeof body.reply === "string" ? body.reply : "";
    const status = typeof body.status === "string" ? body.status : "";

    if (ticketId <= 0) {
      return NextResponse.json({ error: "معرف التذكرة مطلوب" }, { status: 400 });
    }

    if (action === "reply") {
      if (reply.trim().length < 1) {
        return NextResponse.json({ error: "الرد مطلوب" }, { status: 400 });
      }

      await db.execute({
        sql: "UPDATE tickets SET admin_reply = ?, status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [reply.trim(), ticketId],
      });

      return NextResponse.json({ success: true, message: "تم الرد على التذكرة" });
    }

    if (action === "status") {
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: "حالة التذكرة غير صالحة" }, { status: 400 });
      }
      const updated = await db.execute({
        sql: "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [status, ticketId],
      });
      if (Number(updated.rowsAffected || 0) !== 1) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
      return NextResponse.json({ success: true, message: "تم تحديث الحالة" });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحديث التذكرة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
