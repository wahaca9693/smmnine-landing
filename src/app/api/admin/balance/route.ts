import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type BalanceBody = {
  username?: string;
  amount?: string | number;
  type?: "subtract" | "add" | string;
};

type BalanceUserRow = {
  id: number | string;
  balance: number | string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "حدث خطأ";
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { username, amount, type } = (await request.json()) as BalanceBody;

    if (!username || !amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const userResult = await db.execute({
      sql: "SELECT id, balance FROM users WHERE username = ?",
      args: [username],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const user = userResult.rows[0] as unknown as BalanceUserRow;
    const userId = Number(user.id);
    const currentBalance = Number(user.balance);
    const changeAmount = Number(amount);

    if (type === "subtract") {
      if (currentBalance < changeAmount) {
        return NextResponse.json({ error: "رصيد المستخدم غير كافٍ للخصم" }, { status: 400 });
      }
      await db.execute({
        sql: "UPDATE users SET balance = balance - ? WHERE id = ?",
        args: [changeAmount, userId],
      });
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
        args: [userId, "admin", -changeAmount, "completed", "خصم رصيد من الأدمن"],
      });
    } else {
      await db.execute({
        sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
        args: [changeAmount, userId],
      });
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
        args: [userId, "admin", changeAmount, "completed", "إضافة رصيد من الأدمن"],
      });
    }

    const updated = await db.execute({
      sql: "SELECT balance FROM users WHERE id = ?",
      args: [userId],
    });

    return NextResponse.json({
      message: type === "subtract" ? "تم خصم الرصيد" : "تم إضافة الرصيد",
      newBalance: Number((updated.rows[0] as unknown as Pick<BalanceUserRow, "balance">).balance),
    });
  } catch (error: unknown) {
    console.error("Admin balance error:", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
