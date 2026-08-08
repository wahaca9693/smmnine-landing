import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "SELECT id, username, password_hash, role, balance, is_banned FROM users WHERE username = ? OR email = ?",
      args: [username, username],
    });

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    if (Number(user.is_banned)) {
      return NextResponse.json({ error: "تم حظر حسابك - تواصل مع الإدارة" }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    const session = await getSession();
    session.userId = Number(user.id);
    session.username = user.username as string;
    session.role = user.role as string;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        balance: Number(user.balance),
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
