import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createEmailVerificationToken, emailVerificationConfigured, emailVerificationExpiry, emailVerificationRequired, hashEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || typeof session.userId !== "number") return NextResponse.json({ error: "يجب تسجيل الدخول أولًا" }, { status: 401 });

    await initDb();
    const body = await request.json().catch(() => ({})) as { username?: unknown; email?: unknown; currentPassword?: unknown; securityCode?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const securityCode = typeof body.securityCode === "string" ? body.securityCode.trim() : "";
    if (!username || !/^[\p{L}\p{N}_.-]{3,32}$/u.test(username)) return NextResponse.json({ error: "اسم المستخدم يجب أن يكون بين 3 و32 حرفًا أو رقمًا" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    if (!currentPassword) return NextResponse.json({ error: "أدخل كلمة المرور الحالية لتأكيد التعديل" }, { status: 400 });

    const currentResult = await db.execute({ sql: "SELECT username, email, password_hash, security_code_hash, is_2fa_enabled, two_fa_user_configured, email_verified FROM users WHERE id = ? LIMIT 1", args: [session.userId] });
    const current = currentResult.rows[0] as { username?: unknown; email?: unknown; password_hash?: unknown; security_code_hash?: unknown; is_2fa_enabled?: unknown; two_fa_user_configured?: unknown; email_verified?: unknown } | undefined;
    if (!current) return NextResponse.json({ error: "لم يتم العثور على الحساب" }, { status: 404 });
    if (!await bcrypt.compare(currentPassword, String(current.password_hash || ""))) return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 401 });
    if (Number(current.is_2fa_enabled) === 1 && Number(current.two_fa_user_configured || 0) === 1) {
      if (!/^\d{6}$/.test(securityCode) || !await bcrypt.compare(securityCode, String(current.security_code_hash || ""))) return NextResponse.json({ error: "رمز الأمان غير صحيح" }, { status: 401 });
    }

    const duplicate = await db.execute({ sql: "SELECT id FROM users WHERE (username = ? COLLATE NOCASE OR (email IS NOT NULL AND email = ? COLLATE NOCASE)) AND id != ? LIMIT 1", args: [username, email || null, session.userId] });
    if (duplicate.rows.length) return NextResponse.json({ error: "اسم المستخدم أو البريد مستخدم بالفعل" }, { status: 409 });

    const oldEmail = String(current.email || "").trim().toLowerCase();
    const emailChanged = Boolean(email) && email !== oldEmail;
    const mustVerifyEmail = emailChanged && emailVerificationRequired();
    if (mustVerifyEmail && !emailVerificationConfigured()) return NextResponse.json({ error: "تحقق البريد غير مهيأ حاليًا" }, { status: 503 });

    const token = mustVerifyEmail ? createEmailVerificationToken() : "";
    const nextEmailVerified = mustVerifyEmail ? 0 : Number(current.email_verified) === 1 ? 1 : (emailChanged ? 1 : 0);
    await db.execute({
      sql: "UPDATE users SET username = ?, email = ?, email_verified = ?, email_verification_token_hash = ?, email_verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [username, email || null, nextEmailVerified, token ? hashEmailVerificationToken(token) : null, token ? emailVerificationExpiry() : null, session.userId],
    });

    session.username = username;
    session.emailVerified = nextEmailVerified === 1;
    await session.save();

    if (mustVerifyEmail && token) await sendEmailVerification({ to: email, username, token });
    return NextResponse.json({ ok: true, requiresEmailVerification: mustVerifyEmail, user: { username, email: email || null } });
  } catch (error) {
    console.error("Profile update error", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "تعذر تحديث بيانات الحساب حاليًا" }, { status: 500 });
  }
}
