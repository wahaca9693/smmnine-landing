import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { emailVerificationRequired } from "@/lib/email-verification";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  verifyTurnstileToken,
  SecurityServiceUnavailable,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as {
      username?: unknown;
      password?: unknown;
      cfTurnstileToken?: unknown;
      turnstileToken?: unknown;
    };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ error: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    const rate = await checkAuthRateLimit(request, "login", username);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "تم إيقاف محاولات الدخول مؤقتًا من أجل حماية الحسابات. أعد المحاولة لاحقًا." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds || 900) },
        },
      );
    }

    const turnstile = await verifyTurnstileToken(
      request,
      body.cfTurnstileToken || body.turnstileToken,
      "auth",
    );
    if (!turnstile.valid) {
      return NextResponse.json(
        { error: turnstile.enabled ? "يرجى إكمال التحقق الأمني ثم إعادة المحاولة." : "تعذر التحقق من الطلب. أعد المحاولة بعد قليل." },
        { status: 400 },
      );
    }

    const result = await db.execute({
      sql: "SELECT id, username, email, password_hash, role, balance, is_banned, login_preference, is_2fa_enabled, two_fa_user_configured, security_code_hash, email_verified FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE",
      args: [username, username],
    });

    const user = result.rows[0] as Record<string, unknown> | undefined;
    if (!user) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Validate login preference
    const inputIdentifier = username.toLowerCase();
    const dbUsername = String(user.username || "").toLowerCase();
    const dbEmail = String(user.email || "").toLowerCase();
    const preference = String(user.login_preference || "both");

    const isEmailInput = inputIdentifier.includes("@");

    if (preference === "username" && isEmailInput) {
      return NextResponse.json({ error: "هذا الحساب مخصص للدخول عبر اسم المستخدم فقط" }, { status: 403 });
    }
    if (preference === "email" && !isEmailInput) {
      return NextResponse.json({ error: "هذا الحساب مخصص للدخول عبر البريد الإلكتروني فقط" }, { status: 403 });
    }

    // Check if the input matches the allowed identifier
    if (isEmailInput && inputIdentifier !== dbEmail) {
      return NextResponse.json({ error: "البريد الإلكتروني غير مسجل" }, { status: 401 });
    }
    if (!isEmailInput && inputIdentifier !== dbUsername) {
      return NextResponse.json({ error: "اسم المستخدم غير صحيح" }, { status: 401 });
    }

    if (Number(user.is_banned)) {
      return NextResponse.json({ error: "تم حظر حسابك - تواصل مع الإدارة" }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, String(user.password_hash || ""));
    if (!valid) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    await clearAuthRateLimit(request, "login", username);

    const session = await getSession();
    session.userId = Number(user.id);
    session.username = String(user.username);
    session.role = String(user.role);
    session.isLoggedIn = true;
    session.balance = Number(user.balance || 0);

    // 2FA اختياري ولا يصبح فعالًا إلا بعد حفظه من إعدادات الأمان.
    const is2faEnabled = Number(user.is_2fa_enabled) === 1 && Number(user.two_fa_user_configured || 0) === 1;
    session.is2faEnabled = is2faEnabled;
    session.is2faVerified = !is2faEnabled;
    const isEmailVerified = !emailVerificationRequired() || Number(user.email_verified) === 1;
    session.emailVerified = isEmailVerified;

    await session.save();

    return NextResponse.json({
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        balance: Number(user.balance),
        emailVerified: isEmailVerified,
      },
      requires2fa: is2faEnabled,
      requiresEmailVerification: !isEmailVerified,
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    if (error instanceof SecurityServiceUnavailable) {
      return NextResponse.json({ error: "حماية الدخول غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "حدث خطأ" }, { status: 500 });
  }
}
