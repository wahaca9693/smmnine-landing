import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "غير مصرح به" }, { status: 401 });
    }

    const { code } = await request.json() as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "يرجى إدخال رمز الأمان" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "SELECT security_code_hash, username, role, balance, is_2fa_enabled FROM users WHERE id = ?",
      args: [session.userId],
    });

    const user = result.rows[0] as {
      security_code_hash?: string;
      username?: string;
      role?: string;
      balance?: number | string;
      is_2fa_enabled?: number | boolean | string;
    } | undefined;
    if (!user || Number(user.is_2fa_enabled || 0) !== 1) {
      return NextResponse.json({ error: "التحقق الثنائي غير مفعّل لهذا الحساب" }, { status: 400 });
    }
    if (!user.security_code_hash) {
      return NextResponse.json({ error: "لم يتم إعداد رمز أمان لهذا الحساب" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(code, user.security_code_hash);
    if (!isValid) {
      return NextResponse.json({ error: "رمز الأمان غير صحيح" }, { status: 401 });
    }

    // Update session and database
    session.is2faVerified = true;
    await session.save();

    await db.execute({
      sql: "UPDATE users SET last_2fa_verified_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [session.userId],
    });

    return NextResponse.json({
      ok: true,
      user: user.username && user.role
        ? {
            username: user.username,
            role: user.role,
            balance: Number(user.balance || 0),
            is2faEnabled: Boolean(user.is_2fa_enabled),
            is2faVerified: true,
          }
        : undefined,
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء التحقق" }, { status: 500 });
  }
}
