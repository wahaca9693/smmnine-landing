import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

export async function GET() {
  try {
    await requireAdmin();
    const result = await db.execute(`
      SELECT cd.*, u.username
      FROM crypto_deposits cd
      LEFT JOIN users u ON u.id = cd.user_id
      ORDER BY cd.id DESC
      LIMIT 100
    `);
    return json({ deposits: result.rows });
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Forbidden") return json({ error: "غير مصرح" }, { status: 403 });
    if (message === "Account banned") return json({ error: "الحساب محظور" }, { status: 403 });
    return json({ error: "تعذر معالجة إيداع الكريبتو حاليًا" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, action } = await request.json();

    const current = await db.execute({ sql: "SELECT * FROM crypto_deposits WHERE id = ?", args: [id] });
    const deposit = current.rows[0] as any;
    if (!deposit) return json({ error: "الإيداع غير موجود" }, { status: 404 });
    if (deposit.status !== "pending") return json({ error: "الإيداع لم يعد معلقًا" }, { status: 400 });

    if (action === "reject") {
      await db.execute({
        sql: "UPDATE crypto_deposits SET status = 'rejected' WHERE id = ? AND status = 'pending'",
        args: [id],
      });
      return json({ message: "تم رفض الإيداع" });
    }

    if (action !== "approve") return json({ error: "إجراء غير صالح" }, { status: 400 });

    const userId = Number(deposit.user_id);
    const amount = Number(deposit.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "مبلغ الإيداع غير صالح" }, { status: 400 });

    // Claim the pending row first. A second approval request then cannot credit twice.
    const claimed = await db.execute({
      sql: "UPDATE crypto_deposits SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'",
      args: [id],
    });
    if (Number((claimed as any).rowsAffected || 0) !== 1) {
      return json({ error: "تمت معالجة الإيداع مسبقًا" }, { status: 409 });
    }

    await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [amount, userId] });

    const description = `شحن كريبتو تلقائي — ${deposit.coin} ${deposit.network}`;
    const pendingTransaction = await db.execute({
      sql: `SELECT id FROM transactions
            WHERE user_id = ? AND type = 'deposit' AND amount = ? AND status = 'pending'
              AND description LIKE 'طلب شحن رصيد - شحن كريبتو%'
            ORDER BY id DESC LIMIT 1`,
      args: [userId, amount],
    });
    if (pendingTransaction.rows[0]) {
      await db.execute({
        sql: "UPDATE transactions SET status = 'completed', description = ? WHERE id = ?",
        args: [description, Number((pendingTransaction.rows[0] as any).id)],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO transactions (user_id, type, amount, status, description)
              VALUES (?, 'deposit', ?, 'completed', ?)`,
        args: [userId, amount, description],
      });
    }

    return json({ message: "تم شحن الرصيد للمستخدم" });
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Forbidden") return json({ error: "غير مصرح" }, { status: 403 });
    if (message === "Account banned") return json({ error: "الحساب محظور" }, { status: 403 });
    return json({ error: "تعذر معالجة إيداع الكريبتو حاليًا" }, { status: 500 });
  }
}
