import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkAuthRateLimit, SecurityServiceUnavailable } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

function passwordError(password: string): string {
  if (password.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/[0-9]/.test(password)) return "كلمة المرور يجب أن تحتوي على حروف وأرقام";
  return "";
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as { registrationId?: unknown; password?: unknown };
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!registrationId || registrationId.length > 128) return json({ error: "جلسة التسجيل غير صالحة" }, { status: 400 });
    const passError = passwordError(password);
    if (passError) return json({ error: passError }, { status: 400 });

    const pendingResult = await db.execute({
      sql: "SELECT registration_id, username, email, terms_accepted, verified_at, completed_at, expires_at FROM pending_registrations WHERE registration_id = ? LIMIT 1",
      args: [registrationId],
    });
    const pending = pendingResult.rows[0] as Record<string, unknown> | undefined;
    if (!pending) return json({ error: "جلسة التسجيل غير موجودة. ابدأ من جديد." }, { status: 404 });
    if (!pending.verified_at) return json({ error: "يجب تأكيد البريد بالرمز أولًا." }, { status: 403 });
    if (pending.completed_at) return json({ error: "تم إكمال هذا التسجيل مسبقًا. سجّل الدخول." }, { status: 409 });
    if (new Date(String(pending.expires_at)).getTime() <= Date.now()) return json({ error: "انتهت جلسة التسجيل. ابدأ من جديد." }, { status: 410 });

    const rate = await checkAuthRateLimit(request, "register", String(pending.email || registrationId));
    if (!rate.allowed) return json({ error: "محاولات الإكمال كثيرة جدًا. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });

    const hash = await bcrypt.hash(password, 12);
    const securityCode = String(randomInt(100000, 1000000));
    const securityCodeHash = await bcrypt.hash(securityCode, 10);
    const transaction = await db.transaction("write");
    try {
      const existing = await transaction.execute({
        sql: "SELECT username, email FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1",
        args: [String(pending.username), String(pending.email)],
      });
      if (existing.rows.length > 0) {
        await transaction.rollback();
        const row = existing.rows[0] as Record<string, unknown>;
        return json({ error: String(row.username || "").toLowerCase() === String(pending.username).toLowerCase() ? "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر." : "هذا البريد الإلكتروني مستخدم بالفعل. استخدم بريدًا آخر أو سجّل الدخول." }, { status: 409 });
      }

      const claim = await transaction.execute({
        sql: `UPDATE pending_registrations
              SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
              WHERE registration_id = ? AND verified_at IS NOT NULL AND completed_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
        args: [registrationId],
      });
      if (Number(claim.rowsAffected || 0) !== 1) {
        await transaction.rollback();
        return json({ error: "انتهت جلسة التسجيل أو تم استخدامها. ابدأ من جديد." }, { status: 409 });
      }

      const inserted = await transaction.execute({
        sql: `INSERT INTO users (username, email, password_hash, security_code_hash, login_preference, balance, role, terms_accepted, is_2fa_enabled, two_fa_frequency, email_verified, email_verification_token_hash, email_verification_expires_at)
              VALUES (?, ?, ?, ?, 'both', 0, 'user', ?, 1, 'always', 1, NULL, NULL)`,
        args: [String(pending.username), String(pending.email), hash, securityCodeHash, Number(pending.terms_accepted || 1)],
      });
      const userId = Number(inserted.lastInsertRowid);
      await transaction.execute({
        sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
        args: [userId, "مرحباً بك!", "تم إنشاء حسابك بعد تأكيد البريد الإلكتروني. اقرأ شروط الاستخدام قبل الطلب."],
      });
      await transaction.commit();

      const session = await getSession();
      session.userId = userId;
      session.username = String(pending.username);
      session.role = "user";
      session.isLoggedIn = true;
      session.balance = 0;
      session.is2faEnabled = true;
      session.is2faVerified = false;
      session.emailVerified = true;
      await session.save();

      return json({
        user: { id: userId, username: String(pending.username), role: "user", balance: 0 },
        securityCode,
        requires2fa: true,
        emailVerified: true,
      });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error: unknown) {
    console.error("Registration completion failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && /unique|constraint/i.test(error.message)) return json({ error: "بيانات الحساب مستخدمة بالفعل. اختر اسمًا أو بريدًا آخر." }, { status: 409 });
    return json({ error: "تعذر إنشاء الحساب حاليًا. حاول مرة أخرى بعد قليل." }, { status: 500 });
  }
}
