import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { checkAuthRateLimit, isSuspiciousRegistration, securityErrorMessage, SecurityServiceUnavailable, verifyTurnstileToken } from "@/lib/security";
import { startEmailOtp, superTokensOtpConfigured } from "@/lib/supertokens-otp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_\u0600-\u06FF.-]{3,32}$/;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!username || !email) return json({ error: "يرجى إدخال اسم المستخدم والبريد الإلكتروني" }, { status: 400 });
    if (!USERNAME_RE.test(username)) return json({ error: "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا دون رموز غير مسموحة" }, { status: 400 });
    if (!EMAIL_RE.test(email)) return json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    if (body.termsAccepted !== true) return json({ error: "يجب الموافقة على شروط الاستخدام" }, { status: 400 });
    if (isSuspiciousRegistration({ honeypot: body.website, formStartedAt: body.formStartedAt })) {
      return json({ error: securityErrorMessage() }, { status: 400 });
    }

    const rate = await checkAuthRateLimit(request, "register", `${username}|${email}`);
    if (!rate.allowed) return json({ error: "تم إيقاف محاولات التسجيل مؤقتًا لحماية المنصة. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });

    const turnstile = await verifyTurnstileToken(request, body.cfTurnstileToken || body.turnstileToken, "auth");
    if (!turnstile.valid) return json({ error: turnstile.enabled ? "يرجى إكمال التحقق الأمني ثم إعادة المحاولة." : securityErrorMessage() }, { status: 400 });
    if (!superTokensOtpConfigured()) return json({ error: "تحقق البريد غير مهيأ حاليًا. أعد المحاولة بعد تهيئة SuperTokens." }, { status: 503 });

    const existing = await db.execute({
      sql: "SELECT username, email FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1",
      args: [username, email],
    });
    const existingRow = existing.rows[0] as Record<string, unknown> | undefined;
    if (existingRow) {
      return json({
        error: String(existingRow.username || "").toLowerCase() === username.toLowerCase()
          ? "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر."
          : "هذا البريد الإلكتروني مستخدم بالفعل. استخدم بريدًا آخر أو سجّل الدخول.",
      }, { status: 409 });
    }

    const otp = await startEmailOtp(email);
    const registrationId = randomUUID();
    const expiresAt = new Date(Date.now() + Math.min(Math.max(otp.codeLifetime * 1000, 5 * 60 * 1000), 15 * 60 * 1000)).toISOString();

    await db.execute({
      sql: "DELETE FROM pending_registrations WHERE email = ? OR username = ? OR expires_at <= CURRENT_TIMESTAMP",
      args: [email, username],
    });
    await db.execute({
      sql: `INSERT INTO pending_registrations (registration_id, username, email, terms_accepted, device_id, pre_auth_session_id, expires_at)
            VALUES (?, ?, ?, 1, ?, ?, ?)`,
      args: [registrationId, username, email, otp.deviceId, otp.preAuthSessionId, expiresAt],
    });

    return json({ registrationId, expiresAt, codeLifetime: otp.codeLifetime });
  } catch (error: unknown) {
    console.error("Registration OTP start failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "SUPERTOKENS_NOT_CONFIGURED") return json({ error: "تحقق البريد غير مهيأ حاليًا. أعد المحاولة بعد تهيئة SuperTokens." }, { status: 503 });
    return json({ error: "تعذر إرسال رمز التحقق حاليًا. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
}
