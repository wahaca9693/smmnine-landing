import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
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

    const identity = await verifyFirebaseEmailIdToken(idToken, true);
    const pendingResult = await db.execute({
      sql: "SELECT registration_id, username, email, firebase_uid, terms_accepted, completed_at, expires_at FROM pending_registrations WHERE registration_id = ? LIMIT 1",
      args: [registrationId],
    });
    const pending = pendingResult.rows[0] as Record<string, unknown> | undefined;
    if (!pending) return json({ error: "جلسة التسجيل غير موجودة. ابدأ من جديد." }, { status: 404 });
    if (pending.completed_at) return json({ error: "تم إكمال هذا التسجيل مسبقًا. سجّل الدخول." }, { status: 409 });
    if (new Date(String(pending.expires_at)).getTime() <= Date.now()) return json({ error: "انتهت جلسة التسجيل. ابدأ من جديد." }, { status: 410 });
    if (String(pending.firebase_uid || "") !== identity.uid || String(pending.email || "").toLowerCase() !== identity.email) return json({ error: "لا تتطابق هوية Firebase مع جلسة التسجيل." }, { status: 403 });

    const transaction = await db.transaction("write");
    try {
      const existing = await transaction.execute({
        sql: "SELECT username, email, firebase_uid FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE OR firebase_uid = ? LIMIT 1",
        args: [String(pending.username), identity.email, identity.uid],
      });
      if (existing.rows.length > 0) {
        await transaction.rollback();
        const row = existing.rows[0] as Record<string, unknown>;
        return json({ error: String(row.username || "").toLowerCase() === String(pending.username).toLowerCase() ? "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر." : "هذا البريد مرتبط بحساب موجود. سجّل الدخول." }, { status: 409 });
      }

      const claim = await transaction.execute({
        sql: "UPDATE pending_registrations SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ? AND completed_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
        args: [registrationId],
      });
      if (Number(claim.rowsAffected || 0) !== 1) {
        await transaction.rollback();
        return json({ error: "انتهت جلسة التسجيل أو تم استخدامها. ابدأ من جديد." }, { status: 409 });
      }

      const unusableLocalPassword = await bcrypt.hash(`firebase:${randomBytes(32).toString("hex")}`, 12);
      const inserted = await transaction.execute({
        sql: `INSERT INTO users (username, email, password_hash, security_code_hash, login_preference, balance, role, terms_accepted, is_2fa_enabled, two_fa_frequency, email_verified, firebase_uid, auth_provider, email_verification_token_hash, email_verification_expires_at)
              VALUES (?, ?, ?, NULL, 'both', 0, 'user', ?, 0, 'always', 1, ?, 'firebase-email', NULL, NULL)`,
        args: [String(pending.username), identity.email, unusableLocalPassword, Number(pending.terms_accepted || 1), identity.uid],
      });
      const userId = Number(inserted.lastInsertRowid);
      await transaction.execute({
        sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
        args: [userId, "مرحباً بك!", "تم تأكيد بريدك الإلكتروني عبر Firebase وإنشاء حسابك."],
      });
      await transaction.commit();

      const session = await getSession();
      session.userId = userId;
      session.username = String(pending.username);
      session.role = "user";
      session.isLoggedIn = true;
      session.balance = 0;
      session.is2faEnabled = false;
      session.is2faVerified = true;
      session.emailVerified = true;
      await session.save();
      return json({ user: { id: userId, username: String(pending.username), role: "user", balance: 0 }, requires2fa: false, emailVerified: true });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error: unknown) {
    console.error("Firebase registration completion failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    if (error instanceof Error && error.message === "FIREBASE_NOT_CONFIGURED") return json({ error: "تسجيل البريد عبر Firebase غير مهيأ حاليًا." }, { status: 503 });
    if (error instanceof Error && error.message === "FIREBASE_EMAIL_VERIFICATION_REQUIRED") return json({ error: "أكد بريدك الإلكتروني من رسالة Firebase ثم حاول مرة أخرى." }, { status: 403 });
    if (error instanceof Error && error.message === "FIREBASE_EMAIL_TOKEN_INVALID") return json({ error: "جلسة Firebase غير صالحة. أعد تسجيل الدخول." }, { status: 401 });
    if (error instanceof Error && /unique|constraint/i.test(error.message)) return json({ error: "بيانات الحساب مستخدمة بالفعل. اختر اسمًا أو بريدًا آخر." }, { status: 409 });
    return json({ error: "تعذر إكمال إنشاء الحساب حاليًا. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
}
