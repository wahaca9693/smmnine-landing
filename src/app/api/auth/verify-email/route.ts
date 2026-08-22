import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashEmailVerificationToken } from "@/lib/email-verification";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: "رابط التحقق غير صالح" }, { status: 400 });
    }

    const tokenHash = hashEmailVerificationToken(token);
    const result = await db.execute({
      sql: "SELECT id, username, email, role, balance FROM users WHERE email_verification_token_hash = ? AND email_verification_expires_at > CURRENT_TIMESTAMP LIMIT 1",
      args: [tokenHash],
    });
    const user = result.rows[0] as { id?: unknown; username?: unknown; email?: unknown; role?: unknown; balance?: unknown } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "رابط التحقق منتهي أو مستخدم مسبقًا" }, { status: 400 });
    }

    const userId = Number(user.id);
    await db.execute({
      sql: "UPDATE users SET email_verified = 1, email_verification_token_hash = NULL, email_verification_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [userId],
    });

    const session = await getSession();
    if (session.userId === userId) {
      session.emailVerified = true;
      await session.save();
    }

    return NextResponse.json({
      ok: true,
      user: {
        username: String(user.username || ""),
        role: String(user.role || "user"),
        balance: Number(user.balance || 0),
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error("Email verification error", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "تعذر تأكيد البريد حاليًا. أعد المحاولة لاحقًا." }, { status: 500 });
  }
}
