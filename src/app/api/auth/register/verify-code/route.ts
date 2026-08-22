import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { checkAuthRateLimit, SecurityServiceUnavailable } from "@/lib/security";
import { checkEmailOtp } from "@/lib/supertokens-otp";

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
    const body = await request.json() as { registrationId?: unknown; code?: unknown };
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^[0-9]{4,12}$/.test(code) || !registrationId || registrationId.length > 128) {
      return json({ error: "يرجى إدخال رمز التحقق الصحيح" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "SELECT registration_id, email, device_id, pre_auth_session_id, verified_at, completed_at, expires_at FROM pending_registrations WHERE registration_id = ? LIMIT 1",
      args: [registrationId],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return json({ error: "جلسة التسجيل غير موجودة. ابدأ التسجيل من جديد." }, { status: 404 });
    if (row.completed_at) return json({ error: "تم إكمال هذا التسجيل مسبقًا." }, { status: 409 });
    if (new Date(String(row.expires_at)).getTime() <= Date.now()) return json({ error: "انتهت صلاحية رمز التحقق. ابدأ التسجيل من جديد." }, { status: 410 });
    if (row.verified_at) return json({ verified: true });

    const rate = await checkAuthRateLimit(request, "register", String(row.email || registrationId));
    if (!rate.allowed) return json({ error: "محاولات التحقق كثيرة جدًا. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });

    const checked = await checkEmailOtp({
      preAuthSessionId: String(row.pre_auth_session_id),
      deviceId: String(row.device_id),
      userInputCode: code,
    });
    if (checked.status !== "OK") {
      const message = checked.status === "EXPIRED_USER_INPUT_CODE_ERROR"
        ? "انتهت صلاحية الرمز. اطلب رمزًا جديدًا."
        : checked.status === "RESTART_FLOW_ERROR"
          ? "انتهت جلسة التحقق. ابدأ التسجيل من جديد."
          : "رمز التحقق غير صحيح. راجع الرسالة وحاول مرة أخرى.";
      return json({ error: message, code: checked.status }, { status: checked.status === "RESTART_FLOW_ERROR" ? 410 : 400 });
    }

    await db.execute({
      sql: "UPDATE pending_registrations SET verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ? AND verified_at IS NULL AND completed_at IS NULL",
      args: [registrationId],
    });
    return json({ verified: true, email: String(row.email) });
  } catch (error: unknown) {
    console.error("Registration OTP verification failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "SUPERTOKENS_NOT_CONFIGURED") return json({ error: "تحقق البريد غير مهيأ حاليًا. أعد المحاولة بعد تهيئة SuperTokens." }, { status: 503 });
    return json({ error: "تعذر التحقق من الرمز حاليًا. حاول مرة أخرى." }, { status: 503 });
  }
}
