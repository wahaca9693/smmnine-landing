import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkAuthRateLimit, clearAuthRateLimit, SecurityServiceUnavailable } from "@/lib/security";
import { verifyFirebaseEmailIdToken } from "@/lib/firebase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) } });
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as { idToken?: unknown };
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken) return json({ error: "جلسة Firebase غير موجودة." }, { status: 400 });
    const identity = await verifyFirebaseEmailIdToken(idToken, true);
    const rate = await checkAuthRateLimit(request, "login", identity.uid);
    if (!rate.allowed) return json({ error: "تم إيقاف محاولات الدخول مؤقتًا. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 900) } });

    const result = await db.execute({
      sql: "SELECT id, username, email, role, balance, is_banned, is_2fa_enabled, two_fa_user_configured FROM users WHERE firebase_uid = ? LIMIT 1",
      args: [identity.uid],
    });
    const user = result.rows[0] as Record<string, unknown> | undefined;
    if (!user) {
      const legacy = await db.execute({ sql: "SELECT id FROM users WHERE email = ? COLLATE NOCASE AND (firebase_uid IS NULL OR firebase_uid = '') LIMIT 1", args: [identity.email] });
      return json({ error: legacy.rows.length ? "هذا البريد مرتبط بحساب محلي قديم. استخدم تسجيل الدخول المحلي." : "حساب Firebase غير مكتمل على المنصة. أكمل التسجيل أولًا." }, { status: 404 });
    }
    if (Number(user.is_banned)) return json({ error: "تم حظر حسابك - تواصل مع الإدارة" }, { status: 403 });

    await clearAuthRateLimit(request, "login", identity.uid);
    const session = await getSession();
    session.userId = Number(user.id);
    session.username = String(user.username);
    session.role = String(user.role);
    session.isLoggedIn = true;
    session.balance = Number(user.balance || 0);
    session.is2faEnabled = Number(user.is_2fa_enabled) === 1 && Number(user.two_fa_user_configured || 0) === 1;
    session.is2faVerified = !session.is2faEnabled;
    session.emailVerified = true;
    await session.save();

    return json({
      user: { id: Number(user.id), username: String(user.username), role: String(user.role), balance: Number(user.balance || 0), emailVerified: true },
      requires2fa: session.is2faEnabled,
      requiresEmailVerification: false,
    });
  } catch (error: unknown) {
    console.error("Firebase login error", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية الدخول غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_NOT_CONFIGURED") return json({ error: "تسجيل البريد عبر Firebase غير مهيأ حاليًا." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_EMAIL_VERIFICATION_REQUIRED") return json({ error: "أكد بريدك الإلكتروني من رسالة Firebase قبل تسجيل الدخول." }, { status: 403 });
    if (error instanceof Error && error.message === "FIREBASE_EMAIL_TOKEN_INVALID") return json({ error: "جلسة Firebase غير صالحة. أعد تسجيل الدخول." }, { status: 401 });
    return json({ error: "تعذر تسجيل الدخول عبر Firebase حاليًا." }, { status: 503 });
  }
}
