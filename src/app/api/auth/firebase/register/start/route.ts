import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { checkAuthRateLimit, isSuspiciousRegistration, securityErrorMessage, SecurityServiceUnavailable, verifyTurnstileToken } from "@/lib/security";
import { verifyFirebaseEmailIdToken } from "@/lib/firebase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERNAME_RE = /^[A-Za-z0-9_\u0600-\u06FF.-]{3,32}$/;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) } });
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    if (!username || !idToken) return json({ error: "يرجى إكمال بيانات التسجيل." }, { status: 400 });
    if (!USERNAME_RE.test(username)) return json({ error: "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا دون رموز غير مسموحة" }, { status: 400 });
    if (body.termsAccepted !== true) return json({ error: "يجب الموافقة على شروط الاستخدام" }, { status: 400 });
    if (isSuspiciousRegistration({ honeypot: body.website, formStartedAt: body.formStartedAt })) return json({ error: securityErrorMessage() }, { status: 400 });

    const identity = await verifyFirebaseEmailIdToken(idToken, false);
    const rate = await checkAuthRateLimit(request, "register", `${identity.uid}|${identity.email}`);
    if (!rate.allowed) return json({ error: "تم إيقاف محاولات التسجيل مؤقتًا لحماية المنصة. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });
    const turnstile = await verifyTurnstileToken(request, body.cfTurnstileToken || body.turnstileToken, "auth");
    if (!turnstile.valid) return json({ error: turnstile.enabled ? "يرجى إكمال التحقق الأمني ثم إعادة المحاولة." : securityErrorMessage() }, { status: 400 });

    const existing = await db.execute({
      sql: "SELECT username, email, firebase_uid FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE OR firebase_uid = ? LIMIT 1",
      args: [username, identity.email, identity.uid],
    });
    const row = existing.rows[0] as Record<string, unknown> | undefined;
    if (row) {
      return json({
        error: String(row.username || "").toLowerCase() === username.toLowerCase()
          ? "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر."
          : "هذا البريد مرتبط بحساب موجود. سجّل الدخول بدل إنشاء حساب جديد.",
      }, { status: 409 });
    }

    const registrationId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await db.execute({ sql: "DELETE FROM pending_registrations WHERE email = ? OR username = ? OR firebase_uid = ? OR expires_at <= CURRENT_TIMESTAMP", args: [identity.email, username, identity.uid] });
    await db.execute({
      sql: `INSERT INTO pending_registrations (registration_id, username, email, firebase_uid, terms_accepted, device_id, pre_auth_session_id, expires_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [registrationId, username, identity.email, identity.uid, identity.uid, `firebase-email:${identity.uid}`, expiresAt],
    });
    return json({ registrationId, email: identity.email, expiresAt });
  } catch (error: unknown) {
    console.error("Firebase registration start failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_NOT_CONFIGURED") return json({ error: "تسجيل البريد عبر Firebase غير مهيأ حاليًا." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_EMAIL_TOKEN_INVALID") return json({ error: "جلسة Firebase غير صالحة. أعد المحاولة." }, { status: 401 });
    return json({ error: "تعذر بدء التسجيل حاليًا. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
}
