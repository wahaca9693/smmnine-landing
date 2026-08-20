import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type NotificationRow = Record<string, unknown>;

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
      args: [session.userId!],
    });
    const notifications = result.rows.map((row) => {
      const item = row as NotificationRow;
      return {
        ...item,
        id: Number(item.id),
        user_id: Number(item.user_id),
        is_read: Number(item.is_read || 0),
      };
    });
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "يرجى تسجيل الدخول";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    await db.execute({
      sql: "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      args: [session.userId!],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحديث الإشعارات";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
