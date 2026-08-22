import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { checkAuthRateLimit, SecurityServiceUnavailable } from "@/lib/security";
import { resendEmailOtp } from "@/lib/supertokens-otp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as { registrationId?: unknown };
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    if (!registrationId || registrationId.length > 128) return json({ error: "جلسة التسجيل غير صالحة" }, { status: 400 });

    const result = await db.execute({
      sql: "SELECT registration_id, email, device_id, verified_at, completed_at, expires_at FROM pending_registrations WHERE registration_id = ? LIMIT 1",
      args: [registrationId],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return json({ error: "جلسة التسجيل غير موجودة. ابدأ من جديد." }, { status: 404 });
    if (row.verified_at) return json({ error: "تم تأكيد البريد بالفعل." }, { status: 409 });
    if (row.completed_at) return json({ error: "تم إكمال هذا التسجيل مسبقًا." }, { status: 409 });
    if (new Date(String(row.expires_at)).getTime() <= Date.now()) return json({ error: "انتهت جلسة التسجيل. ابدأ من جديد." }, { status: 410 });

    const rate = await checkAuthRateLimit(request, "register", String(row.email || registrationId));
    if (!rate.allowed) return json({ error: "طلبات إعادة الإرسال كثيرة جدًا. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });

    const otp = await resendEmailOtp({ deviceId: String(row.device_id) });
    if (otp.status !== "OK") return json({ error: "انتهت جلسة الرمز. ابدأ التسجيل من جديد." }, { status: 410 });
    const expiresAt = new Date(Date.now() + Math.min(Math.max(otp.codeLifetime * 1000, 5 * 60 * 1000), 15 * 60 * 1000)).toISOString();
    await db.execute({
      sql: "UPDATE pending_registrations SET pre_auth_session_id = ?, device_id = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ? AND verified_at IS NULL AND completed_at IS NULL",
      args: [otp.preAuthSessionId, otp.deviceId, expiresAt, registrationId],
    });
    return json({ resent: true, expiresAt, codeLifetime: otp.codeLifetime });
  } catch (error: unknown) {
    console.error("Registration OTP resend failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "SUPERTOKENS_NOT_CONFIGURED") return json({ error: "تحقق البريد غير مهيأ حاليًا. أعد المحاولة بعد تهيئة SuperTokens." }, { status: 503 });
    return json({ error: "تعذر إعادة إرسال الرمز حاليًا. حاول مرة أخرى." }, { status: 503 });
  }
}
