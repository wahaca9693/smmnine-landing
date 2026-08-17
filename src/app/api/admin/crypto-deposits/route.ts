import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const res = await db.execute(`
      SELECT cd.*, u.username
      FROM crypto_deposits cd
      LEFT JOIN users u ON u.id = cd.user_id
      ORDER BY cd.id DESC
      LIMIT 100
    `);
    return NextResponse.json({ deposits: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, action } = await request.json();

    const cur = await db.execute({ sql: "SELECT * FROM crypto_deposits WHERE id = ?", args: [id] });
    const dep = cur.rows[0] as any;
    if (!dep) return NextResponse.json({ error: "الإيداع غير موجود" }, { status: 404 });
    if (dep.status !== "pending") return NextResponse.json({ error: "الإيداع لم يعد معلقًا" }, { status: 400 });

    const userId = Number(dep.user_id);
    const amount = Number(dep.amount);

    if (action === "approve") {
      // شحن رصيد المستخدم مباشرة
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [amount, userId] });
      await db.execute({ sql: "UPDATE crypto_deposits SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
      await db.execute({
        sql: `INSERT INTO transactions (user_id, type, amount, status, description)
              VALUES (?, 'deposit', ?, 'completed', ?)`,
        args: [userId, amount, `شحن كريبتو تلقائي — ${dep.coin} ${dep.network}`],
      });
      return NextResponse.json({ message: "تم شحن الرصيد للمستخدم" });
    }
    if (action === "reject") {
      await db.execute({ sql: "UPDATE crypto_deposits SET status = 'rejected' WHERE id = ?", args: [id] });
      return NextResponse.json({ message: "تم رفض الإيداع" });
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
