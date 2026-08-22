import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { checkAuthRateLimit, SecurityServiceUnavailable } from "@/lib/security";
import { verifyFirebaseEmailIdToken } from "@/lib/firebase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) } });
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as { registrationId?: unknown; idToken?: unknown };
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    if (!registrationId || registrationId.length > 128 || !idToken) return json({ error: "جلسة التسجيل غير صالحة." }, { status: 400 });
    const identity = await verifyFirebaseEmailIdToken(idToken, false);
    const rate = await checkAuthRateLimit(request, "register", `${identity.uid}|resend`);
    if (!rate.allowed) return json({ error: "تم تجاوز حد إعادة الإرسال. انتظر قليلًا ثم حاول مرة أخرى." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });
    const result = await db.execute({ sql: "SELECT firebase_uid, email, completed_at, expires_at FROM pending_registrations WHERE registration_id = ? LIMIT 1", args: [registrationId] });
    const pending = result.rows[0] as Record<string, unknown> | undefined;
    if (!pending || String(pending.firebase_uid || "") !== identity.uid || String(pending.email || "").toLowerCase() !== identity.email) return json({ error: "جلسة التسجيل غير موجودة أو غير صالحة." }, { status: 404 });
    if (pending.completed_at) return json({ error: "تم إكمال هذا التسجيل مسبقًا. سجّل الدخول." }, { status: 409 });
    if (new Date(String(pending.expires_at)).getTime() <= Date.now()) return json({ error: "انتهت جلسة التسجيل. ابدأ من جديد." }, { status: 410 });
    return json({ allowed: true });
  } catch (error: unknown) {
    console.error("Firebase verification resend authorization failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_NOT_CONFIGURED") return json({ error: "تسجيل البريد عبر Firebase غير مهيأ حاليًا." }, { status: 503 });
    if (error instanceof Error && /FIREBASE_EMAIL_TOKEN_INVALID|JWT|JWS/.test(error.message)) return json({ error: "جلسة Firebase غير صالحة. أعد المحاولة." }, { status: 401 });
    return json({ error: "تعذر تجهيز إعادة الإرسال حاليًا." }, { status: 503 });
  }
}
