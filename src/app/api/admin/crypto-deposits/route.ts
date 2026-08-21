import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type DbRow = Record<string, unknown>;
type DepositActionBody = { id?: unknown; action?: unknown };

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Forbidden") return json({ error: "غير مصرح" }, { status: 403 });
    if (message === "Account banned") return json({ error: "الحساب محظور" }, { status: 403 });
    return json({ error: "تعذر معالجة إيداع الكريبتو حاليًا" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as DepositActionBody;
    const id = Number(body.id || 0);
    const action = typeof body.action === "string" ? body.action : "";
    if (!Number.isInteger(id) || id <= 0) return json({ error: "معرّف الإيداع غير صالح" }, { status: 400 });

    const current = await db.execute({ sql: "SELECT * FROM crypto_deposits WHERE id = ?", args: [id] });
    const deposit = current.rows[0] as DbRow | undefined;
    if (!deposit) return json({ error: "الإيداع غير موجود" }, { status: 404 });
    if (deposit.status !== "pending") return json({ error: "الإيداع لم يعد معلقًا" }, { status: 400 });

    if (action === "reject") {
      const rejected = await db.execute({
        sql: "UPDATE crypto_deposits SET status = 'rejected' WHERE id = ? AND status = 'pending'",
        args: [id],
      });
      if (Number(rejected.rowsAffected || 0) !== 1) return json({ error: "تمت معالجة الإيداع مسبقًا" }, { status: 409 });
      return json({ message: "تم رفض الإيداع" });
    }

    if (action !== "approve") return json({ error: "إجراء غير صالح" }, { status: 400 });

    const userId = Number(deposit.user_id);
    const amount = Number(deposit.amount);
    if (!Number.isInteger(userId) || userId <= 0) return json({ error: "المستخدم المرتبط بالإيداع غير صالح" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "مبلغ الإيداع غير صالح" }, { status: 400 });

    const transaction = await db.transaction("write");
    try {
      // Claim and credit inside one transaction. A concurrent approval can never credit twice.
      const claimed = await transaction.execute({
        sql: "UPDATE crypto_deposits SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'",
        args: [id],
      });
      if (Number(claimed.rowsAffected || 0) !== 1) throw new Error("DEPOSIT_ALREADY_PROCESSED");

      const credited = await transaction.execute({
        sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
        args: [amount, userId],
      });
      if (Number(credited.rowsAffected || 0) !== 1) throw new Error("DEPOSIT_USER_NOT_FOUND");

      const description = `شحن كريبتو تلقائي — ${deposit.coin} ${deposit.network}`;
      const pendingTransaction = await transaction.execute({
        sql: `SELECT id FROM transactions
              WHERE user_id = ? AND type = 'deposit' AND amount = ? AND status = 'pending'
                AND description LIKE 'طلب شحن رصيد - شحن كريبتو%'
              ORDER BY id DESC LIMIT 1`,
        args: [userId, amount],
      });
      if (pendingTransaction.rows[0]) {
        await transaction.execute({
          sql: "UPDATE transactions SET status = 'completed', description = ? WHERE id = ?",
          args: [description, Number((pendingTransaction.rows[0] as DbRow).id)],
        });
      } else {
        await transaction.execute({
          sql: `INSERT INTO transactions (user_id, type, amount, status, description)
                VALUES (?, 'deposit', ?, 'completed', ?)`,
          args: [userId, amount, description],
        });
      }
      await transaction.commit();
    } catch (error: unknown) {
      await transaction.rollback().catch(() => undefined);
      if (error instanceof Error && error.message === "DEPOSIT_ALREADY_PROCESSED") return json({ error: "تمت معالجة الإيداع مسبقًا" }, { status: 409 });
      if (error instanceof Error && error.message === "DEPOSIT_USER_NOT_FOUND") return json({ error: "المستخدم المرتبط بالإيداع غير موجود" }, { status: 409 });
      throw error;
    }

    return json({ message: "تم شحن الرصيد للمستخدم" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Forbidden") return json({ error: "غير مصرح" }, { status: 403 });
    if (message === "Account banned") return json({ error: "الحساب محظور" }, { status: 403 });
    return json({ error: "تعذر معالجة إيداع الكريبتو حاليًا" }, { status: 500 });
  }
}
