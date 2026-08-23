
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
    let session;
    try {
      session = await requireAuth();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "2FA_REQUIRED") {
        return NextResponse.json({ error: "2FA_REQUIRED", requires2fa: true }, { status: 403 });
      }
      if (error instanceof Error && error.message === "EMAIL_VERIFICATION_REQUIRED") {
        return NextResponse.json({ error: "EMAIL_VERIFICATION_REQUIRED", requiresEmailVerification: true }, { status: 403 });
      }
      throw error;
    }
    const userId = session.userId!;

    const [result, notifCount] = await Promise.all([
      db.execute({
        sql: "SELECT id, username, email, balance, role, is_2fa_enabled, two_fa_user_configured, email_verified FROM users WHERE id = ?",
        args: [userId],
      }),
      db.execute({
        sql: "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        args: [userId],
      }),
    ]);

    const user = result.rows[0] as unknown as (UserRow & { is_2fa_enabled: number; two_fa_user_configured?: number | string | boolean; email_verified?: number | string | boolean }) | undefined;
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
        is2faEnabled: Number(user.is_2fa_enabled) === 1 && Number(user.two_fa_user_configured || 0) === 1,
        is2faVerified: Boolean(currentSession.is2faVerified),
        emailVerified: Number(user.email_verified) === 1,
      },
      unreadNotifications: Number(notifCount.rows[0]?.count || 0),
    });
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (message === "Unauthorized" || message === "Account banned") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("User bootstrap error:", error);
    return NextResponse.json({ error: "تعذر تحديث بيانات الحساب مؤقتًا" }, { status: 503 });
  }
}
