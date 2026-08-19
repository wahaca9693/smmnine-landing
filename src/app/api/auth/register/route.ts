import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import {
  checkAuthRateLimit,
  isSuspiciousRegistration,
  securityErrorMessage,
  verifyTurnstileToken,
  SecurityServiceUnavailable,
} from "@/lib/security";

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

    const registrationSetting = await db.execute("SELECT registrationEnabled FROM site_settings LIMIT 1");
    const registrationEnabled = registrationSetting.rows.length === 0 || Boolean(Number((registrationSetting.rows[0] as any)?.registrationEnabled ?? 1));
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

    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
      args: [username],
    });

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "تعذر إنشاء الحساب بهذه البيانات" }, { status: 400 });
    }

    const existingEmail = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
      args: [email],
    });

    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: "تعذر إنشاء الحساب بهذه البيانات" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.execute({
      sql: "INSERT INTO users (username, email, password_hash, balance, role, terms_accepted) VALUES (?, ?, ?, 0, 'user', 1)",
      args: [username, email, hash],
    });

    const userId = Number(result.lastInsertRowid);

    await db.execute({
      sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
      args: [userId, "مرحباً بك!", "تم إنشاء حسابك بنجاح في Follower. اقرأ شروط الاستخدام قبل الطلب."],
    });

    const session = await getSession();
    session.userId = userId;
    session.username = username;
    session.role = "user";
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      user: {
        id: userId,
        username,
        role: "user",
        balance: 0,
      },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    if (err instanceof SecurityServiceUnavailable) {
      return NextResponse.json({ error: "حماية التسجيل غير متاحة مؤقتًا. أعد المحاولة بعد قليل." }, { status: 503 });
    }
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
