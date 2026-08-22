import { randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkAuthRateLimit, SecurityServiceUnavailable } from "@/lib/security";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERNAME_RE = /^[A-Za-z0-9_\u0600-\u06FF.-]{3,32}$/;

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
    const body = await request.json() as { idToken?: unknown; username?: unknown; password?: unknown; termsAccepted?: unknown };
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!idToken || !username || body.termsAccepted !== true) return json({ error: "يرجى إكمال بيانات التسجيل والموافقة على الشروط." }, { status: 400 });
    if (!USERNAME_RE.test(username)) return json({ error: "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا دون رموز غير مسموحة" }, { status: 400 });
    const passError = passwordError(password);
    if (passError) return json({ error: passError }, { status: 400 });

    const identity = await verifyFirebasePhoneIdToken(idToken);
    const rate = await checkAuthRateLimit(request, "register", `${identity.uid}|${identity.phoneNumber}`);
    if (!rate.allowed) return json({ error: "محاولات التسجيل كثيرة جدًا. أعد المحاولة لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) } });

    const transaction = await db.transaction("write");
    try {
      const existing = await transaction.execute({
        sql: "SELECT id, username, firebase_uid, phone_number FROM users WHERE username = ? COLLATE NOCASE OR firebase_uid = ? OR phone_number = ? LIMIT 1",
        args: [username, identity.uid, identity.phoneNumber],
      });
      if (existing.rows.length > 0) {
        await transaction.rollback();
        const row = existing.rows[0] as Record<string, unknown>;
        const error = row.firebase_uid === identity.uid || row.phone_number === identity.phoneNumber
          ? "هذا الرقم مرتبط بحساب موجود. سجّل الدخول بدل إنشاء حساب جديد."
          : "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.";
        return json({ error }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(`${randomBytes(32).toString("hex")}:${password}`, 12);
      const securityCode = String(randomInt(100000, 1000000));
      const securityCodeHash = await bcrypt.hash(securityCode, 10);
      const inserted = await transaction.execute({
        sql: `INSERT INTO users (username, email, password_hash, security_code_hash, login_preference, balance, role, terms_accepted, is_2fa_enabled, two_fa_frequency, email_verified, firebase_uid, phone_number, auth_provider)
              VALUES (?, NULL, ?, ?, 'both', 0, 'user', ?, 1, 'always', 1, ?, ?, 'firebase-phone')`,
        args: [username, passwordHash, securityCodeHash, 1, identity.uid, identity.phoneNumber],
      });
      const userId = Number(inserted.lastInsertRowid);
      await transaction.execute({
        sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
        args: [userId, "مرحباً بك!", "تم إنشاء حسابك بعد تأكيد رقم الهاتف."],
      });
      await transaction.commit();

      const session = await getSession();
      session.userId = userId;
      session.username = username;
      session.role = "user";
      session.isLoggedIn = true;
      session.balance = 0;
      session.is2faEnabled = true;
      session.is2faVerified = false;
      session.emailVerified = true;
      await session.save();
      return json({ user: { id: userId, username, role: "user", balance: 0 }, securityCode, requires2fa: true, phoneVerified: true });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error: unknown) {
    console.error("Firebase phone registration failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof SecurityServiceUnavailable) return json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_NOT_CONFIGURED") return json({ error: "تسجيل الهاتف غير مهيأ حاليًا. أضف إعدادات Firebase العامة للموقع." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_PHONE_TOKEN_REQUIRED") return json({ error: "يجب تأكيد رقم الهاتف عبر Firebase قبل إكمال التسجيل." }, { status: 401 });
    if (error instanceof Error && /unique|constraint/i.test(error.message)) return json({ error: "بيانات الحساب مستخدمة بالفعل. اختر اسمًا آخر أو سجّل الدخول." }, { status: 409 });
    return json({ error: "تعذر إنشاء حساب الهاتف حاليًا. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
}
