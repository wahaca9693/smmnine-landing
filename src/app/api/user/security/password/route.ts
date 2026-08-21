import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "يرجى إدخال كلمة المرور الحالية والجديدة" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }

    const userResult = await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [session.userId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0] as unknown as { password_hash?: string | null };
    if (!user.password_hash) {
      return NextResponse.json({ error: "لا توجد كلمة مرور محفوظة لهذا الحساب" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }

    const newHashed = await bcrypt.hash(newPassword, 12);
    await db.execute({
      sql: "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [newHashed, session.userId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update password:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
