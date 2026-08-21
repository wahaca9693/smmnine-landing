
import { NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type UserRow = {
  id: number | string;
  username: string;
  email: string | null;
  balance: number | string;
  role: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId!;

    const [result, notifCount] = await Promise.all([
      db.execute({
        sql: "SELECT id, username, email, balance, role, is_2fa_enabled FROM users WHERE id = ?",
        args: [userId],
      }),
      db.execute({
        sql: "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        args: [userId],
      }),
    ]);

    const user = result.rows[0] as unknown as (UserRow & { is_2fa_enabled: number }) | undefined;
    if (!user) {
      const s = await getSession();
      s.destroy();
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const currentSession = await getSession();

    return NextResponse.json({
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
        balance: Number(user.balance),
        role: user.role,
        is2faEnabled: Boolean(user.is_2fa_enabled),
        is2faVerified: Boolean(currentSession.is2faVerified)
      },
      unreadNotifications: Number(notifCount.rows[0]?.count || 0),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}
