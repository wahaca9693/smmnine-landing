import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type TicketRow = Record<string, unknown>;
type TicketBody = { type?: unknown; subject?: unknown; description?: unknown; orderId?: unknown };

const VALID_TYPES = [
  "speed_up",
  "refill",
  "recharge_issue",
  "cancel_order",
  "other",
  "inquiry",
];

const TYPE_LABELS: Record<string, string> = {
  speed_up: "تسريع طلب",
  refill: "تعويض طلب",
  recharge_issue: "مشكلة في الشحن",
  cancel_order: "إلغاء طلب",
  other: "مشكلة أخرى",
  inquiry: "استفسار عام",
};

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: `SELECT id, type, subject, description, order_id, status, admin_reply, created_at, updated_at 
            FROM tickets WHERE user_id = ? ORDER BY created_at DESC`,
      args: [session.userId!],
    });

    const tickets = result.rows.map((row) => {
      const item = row as TicketRow;
      const type = String(item.type || "other");
      return {
        id: Number(item.id),
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
    const message = error instanceof Error ? error.message : "يرجى تسجيل الدخول";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json() as TicketBody;
    const type = typeof body.type === "string" ? body.type : "";
    const subject = typeof body.subject === "string" ? body.subject : "";
    const description = typeof body.description === "string" ? body.description : "";
    const orderId = typeof body.orderId === "number" || typeof body.orderId === "string" ? body.orderId : null;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "نوع التذكرة غير صالح" }, { status: 400 });
    }
    if (subject.trim().length < 3) {
      return NextResponse.json({ error: "العنوان مطلوب (3 أحرف على الأقل)" }, { status: 400 });
    }
    if (description.trim().length < 10) {
      return NextResponse.json({ error: "الوصف مطلوب (10 أحرف على الأقل)" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO tickets (user_id, type, subject, description, order_id, status) 
            VALUES (?, ?, ?, ?, ?, 'open')`,
      args: [session.userId!, type, subject.trim(), description.trim(), orderId],
    });

    const ticketId = result.lastInsertRowid ? Number(result.lastInsertRowid) : 0;

    return NextResponse.json({
      success: true,
      ticketId,
      message: "تم إرسال التذكرة بنجاح، سنرد عليك في أقرب وقت",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال التذكرة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
