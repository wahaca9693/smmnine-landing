import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const tickets = result.rows.map((row: any) => ({
      id: Number(row.id),
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
    const session = await requireAuth();
    const body = await request.json();
    const { type, subject, description, orderId } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "نوع التذكرة غير صالح" }, { status: 400 });
    }
    if (!subject || String(subject).trim().length < 3) {
      return NextResponse.json({ error: "العنوان مطلوب (3 أحرف على الأقل)" }, { status: 400 });
    }
    if (!description || String(description).trim().length < 10) {
      return NextResponse.json({ error: "الوصف مطلوب (10 أحرف على الأقل)" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO tickets (user_id, type, subject, description, order_id, status) 
            VALUES (?, ?, ?, ?, ?, 'open')`,
      args: [session.userId!, type, String(subject).trim(), String(description).trim(), orderId || null],
    });

    const ticketId = result.lastInsertRowid ? Number(result.lastInsertRowid) : 0;

    return NextResponse.json({
      success: true,
      ticketId,
      message: "تم إرسال التذكرة بنجاح، سنرد عليك في أقرب وقت",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
