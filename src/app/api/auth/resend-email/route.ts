import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createEmailVerificationToken, emailVerificationExpiry, emailVerificationRequired, hashEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";

export async function POST() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || typeof session.userId !== "number") {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا" }, { status: 401 });
    }
    if (!emailVerificationRequired()) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const result = await db.execute({
      sql: "SELECT username, email, email_verified FROM users WHERE id = ? LIMIT 1",
      args: [session.userId],
    });
    const user = result.rows[0] as { username?: unknown; email?: unknown; email_verified?: unknown } | undefined;
    if (!user || !user.email) return NextResponse.json({ error: "لا يوجد بريد إلكتروني للحساب" }, { status: 400 });
    if (Number(user.email_verified) === 1) return NextResponse.json({ ok: true, alreadyVerified: true });

    const token = createEmailVerificationToken();
    await db.execute({
      sql: "UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = ? WHERE id = ?",
      args: [hashEmailVerificationToken(token), emailVerificationExpiry(), session.userId],
    });
    const delivery = await sendEmailVerification({ to: String(user.email), username: String(user.username || ""), token });
    if (!delivery.sent) return NextResponse.json({ error: "تعذر إرسال رسالة التحقق حاليًا" }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend email verification error", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "تعذر إرسال رسالة التحقق حاليًا" }, { status: 500 });
  }
}
