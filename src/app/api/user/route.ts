import { NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT id, username, email, balance, role FROM users WHERE id = ?",
      args: [session.userId!],
    });

    const user = result.rows[0];
    if (!user) {
      const s = await getSession();
      s.destroy();
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const notifCount = await db.execute({
      sql: "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      args: [session.userId!],
    });

    return NextResponse.json({
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
        balance: Number(user.balance),
        role: user.role,
      },
      unreadNotifications: Number(notifCount.rows[0]?.count || 0),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
