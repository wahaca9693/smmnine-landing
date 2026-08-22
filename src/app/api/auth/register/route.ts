import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { createEmailVerificationToken, emailVerificationConfigured, emailVerificationExpiry, emailVerificationRequired, hashEmailVerificationToken, sendEmailVerification } from "@/lib/email-verification";
import type { InStatement, ResultSet } from "@libsql/client";
import {
  checkAuthRateLimit,
  isSuspiciousRegistration,
  securityErrorMessage,
  verifyTurnstileToken,
  SecurityServiceUnavailable,
} from "@/lib/security";

type RegistrationSettingsRow = { registrationEnabled?: unknown };
type ExistingUserRow = { username?: unknown; email?: unknown };

class RegistrationStorageUnavailable extends Error {
  constructor() {
    super("Registration storage unavailable");
    this.name = "RegistrationStorageUnavailable";
  }
}

const REGISTRATION_DB_TIMEOUT_MS = 7000;

async function registrationDbExecute(statement: InStatement, operation: string): Promise<ResultSet> {
  try {
    return await Promise.race([
      db.execute(statement),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new RegistrationStorageUnavailable()), REGISTRATION_DB_TIMEOUT_MS);
      }),
    ]);
  } catch (error: unknown) {
    console.error("Registration storage operation failed", {
      operation,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    if (error instanceof RegistrationStorageUnavailable) throw error;
    throw new RegistrationStorageUnavailable();
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique|constraint/i.test(error.message);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      username?: unknown;
      email?: unknown;
      password?: unknown;
      termsAccepted?: unknown;
      cfTurnstileToken?: unknown;
      turnstileToken?: unknown;
      website?: unknown;
      formStartedAt?: unknown;
    };

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !email || !password) {
      return NextResponse.json({ error: "يرجى إدخال اسم المستخدم والبريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    let registrationEnabled = true;
    try {
      const registrationSetting = await registrationDbExecute(
        { sql: "SELECT registrationEnabled FROM site_settings LIMIT 1", args: [] },
        "read-registration-setting",
      );
      const registrationRow = registrationSetting.rows[0] as unknown as RegistrationSettingsRow | undefined;
      registrationEnabled = registrationSetting.rows.length === 0 || Boolean(Number(registrationRow?.registrationEnabled ?? 1));
    } catch (e) {
      console.warn("Could not read registration settings, defaulting to enabled", e);
    }
    if (!registrationEnabled) {
      return NextResponse.json({ error: "التسجيل الجديد متوقف مؤقتًا من الإدارة. يرجى المحاولة لاحقًا." }, { status: 403 });
    }

    // ارفض الإرسال الآلي الواضح قبل لمس قاعدة البيانات أو استهلاك حصة المحدد.
    if (isSuspiciousRegistration({ honeypot: body.website, formStartedAt: body.formStartedAt })) {
      return NextResponse.json({ error: securityErrorMessage() }, { status: 400 });
    }

    const rate = await checkAuthRateLimit(request, "register", `${username}|${email}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "تم إيقاف محاولات التسجيل مؤقتًا من أجل حماية المنصة. أعد المحاولة لاحقًا." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds || 3600) },
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
        { error: turnstile.enabled ? "يرجى إكمال التحقق الأمني ثم إعادة المحاولة." : securityErrorMessage() },
        { status: 400 },
      );
    }

    if (body.termsAccepted !== true) {
      return NextResponse.json({ error: "يجب الموافقة على شروط الاستخدام" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    if (!/^[A-Za-z0-9_\u0600-\u06FF.-]{3,32}$/.test(username)) {
      return NextResponse.json({ error: "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا دون رموز غير مسموحة" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }

    if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تحتوي على حروف وأرقام" }, { status: 400 });
    }

    // قراءة واحدة للتكرار تقلل زمن التسجيل وتبقي رسالة واضحة للمستخدم.
    const existingUser = await registrationDbExecute(
      {
        sql: "SELECT username, email FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1",
        args: [username, email],
      },
      "check-registration-uniqueness",
    );

    const existingRow = existingUser.rows[0] as unknown as ExistingUserRow | undefined;
    if (existingRow) {
      const existingUsername = String(existingRow.username ?? "").toLowerCase();
      return NextResponse.json(
        {
          error: existingUsername === username.toLowerCase()
            ? "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر."
            : "هذا البريد الإلكتروني مستخدم بالفعل. استخدم بريدًا آخر أو سجّل الدخول.",
        },
        { status: 409 },
      );
    }

    const hash = await bcrypt.hash(password, 12);

    // Generate a random 6-digit security code for the new user
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
    const securityCodeHash = await bcrypt.hash(securityCode, 10);
    const shouldVerifyEmail = emailVerificationRequired();
    if (shouldVerifyEmail && !emailVerificationConfigured()) {
      return NextResponse.json({ error: "تحقق البريد غير مهيأ حاليًا. أعد المحاولة لاحقًا." }, { status: 503 });
    }
    const emailToken = shouldVerifyEmail ? createEmailVerificationToken() : "";
    const emailTokenHash = emailToken ? hashEmailVerificationToken(emailToken) : null;
    const emailTokenExpiry = emailToken ? emailVerificationExpiry() : null;

    let result: ResultSet;
    try {
      result = await db.execute({
        sql: "INSERT INTO users (username, email, password_hash, security_code_hash, login_preference, balance, role, terms_accepted, is_2fa_enabled, two_fa_frequency, email_verified, email_verification_token_hash, email_verification_expires_at) VALUES (?, ?, ?, ?, 'both', 0, 'user', 1, 1, 'always', ?, ?, ?)",
        args: [username, email, hash, securityCodeHash, shouldVerifyEmail ? 0 : 1, emailTokenHash, emailTokenExpiry],
      });
    } catch (error: unknown) {
      // يعالج سباق التسجيل بين فحص التكرار والإدراج دون كشف رسالة SQL.
      if (isUniqueConstraintError(error)) {
        return NextResponse.json({ error: "بيانات الحساب مستخدمة بالفعل. اختر اسمًا أو بريدًا آخر." }, { status: 409 });
      }
      throw error;
    }

    const userId = Number(result.lastInsertRowid);

    // الإشعار ترحيبي اختياري؛ لا ينبغي أن يمنع تسجيل الحساب إذا تعذر حفظه.
    try {
      await registrationDbExecute(
        {
          sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
          args: [userId, "مرحباً بك!", "تم إنشاء حسابك بنجاح. اقرأ شروط الاستخدام قبل الطلب."],
        },
        "create-welcome-notification",
      );
    } catch (error: unknown) {
      console.warn("Welcome notification was skipped", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }

    if (shouldVerifyEmail && emailToken) {
      try {
        await sendEmailVerification({ to: email, username, token: emailToken });
      } catch (error) {
        console.error("Email verification delivery failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
      }
    }

    const session = await getSession();
    session.userId = userId;
    session.username = username;
    session.role = "user";
    session.isLoggedIn = true;
    session.balance = 0;
    // الحسابات الجديدة تُنشأ مع 2FA مفعّلًا؛ يجب إكمال التحقق قبل فتح الصفحات المحمية.
    session.is2faEnabled = true;
    session.is2faVerified = false;
    session.emailVerified = !shouldVerifyEmail;
    await session.save();

    return NextResponse.json({
      user: {
        id: userId,
        username,
        role: "user",
        balance: 0,
      },
      securityCode, // Return the code to be shown to the user once
      requiresEmailVerification: shouldVerifyEmail,
    });
  } catch (error: unknown) {
    console.error("Register error", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    if (error instanceof SecurityServiceUnavailable) {
      return NextResponse.json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    }
    if (error instanceof RegistrationStorageUnavailable) {
      return NextResponse.json({ error: "تعذر إنشاء الحساب حاليًا. تحقق من الاتصال وحاول مرة أخرى." }, { status: 503 });
    }
    return NextResponse.json({ error: "تعذر إنشاء الحساب حاليًا. حاول مرة أخرى بعد قليل." }, { status: 500 });
  }
}
