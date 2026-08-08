import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let sql = "SELECT id, username, email, balance, role, is_banned, created_at FROM users WHERE role != 'admin'";
    const args: any[] = [];
    if (search) {
      sql += " AND (username LIKE ? OR email LIKE ?)";
      args.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC LIMIT 200";

    const result = await db.execute({ sql, args });
    const users = result.rows.map((row: any) => ({
      id: Number(row.id),
      username: row.username,
      email: row.email,
      balance: Number(row.balance),
      role: row.role,
      is_banned: Number(row.is_banned),
      created_at: row.created_at,
    }));
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { action, userId, amount, username } = body;
    const uid = Number(userId);

    if (action === "ban") {
      await db.execute({ sql: "UPDATE users SET is_banned = 1 WHERE id = ?", args: [uid] });
      return NextResponse.json({ success: true, message: "تم حظر المستخدم" });
    }

    if (action === "unban") {
      await db.execute({ sql: "UPDATE users SET is_banned = 0 WHERE id = ?", args: [uid] });
      return NextResponse.json({ success: true, message: "تم فك الحظر" });
    }

    if (action === "delete") {
      await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [uid] });
      return NextResponse.json({ success: true, message: "تم حذف المستخدم" });
    }

    if (action === "addBalance") {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [amt, uid] });
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'admin')",
        args: [uid, amt, `إضافة رصيد من الأدمن`],
      });
      return NextResponse.json({ success: true, message: `تم إضافة $${amt.toFixed(4)}` });
    }

    if (action === "subtractBalance") {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
      await db.execute({ sql: "UPDATE users SET balance = balance - ? WHERE id = ?", args: [amt, uid] });
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'admin')",
        args: [uid, -amt, `خصم رصيد من الأدمن`],
      });
      return NextResponse.json({ success: true, message: `تم خصم $${amt.toFixed(4)}` });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
