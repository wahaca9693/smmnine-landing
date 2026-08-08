import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, email, password, termsAccepted } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "يرجى إدخال اسم المستخدم والبريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json({ error: "يجب الموافقة على شروط الاستخدام" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تحتوي على حروف وأرقام" }, { status: 400 });
    }

    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    });

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "اسم المستخدم مستخدم مسبقاً" }, { status: 400 });
    }

    const existingEmail = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: "INSERT INTO users (username, email, password_hash, balance, role, terms_accepted) VALUES (?, ?, ?, 0, 'user', 1)",
      args: [username, email, hash],
    });

    const userId = Number(result.lastInsertRowid);

    // Welcome notification
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
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
