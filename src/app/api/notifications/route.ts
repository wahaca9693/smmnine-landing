import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
      args: [session.userId!],
    });
    const notifications = result.rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      user_id: Number(row.user_id),
      is_read: Number(row.is_read),
    }));
    return NextResponse.json({ notifications });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
