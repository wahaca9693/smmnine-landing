import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type TransactionRow = Record<string, unknown>;

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
      args: [session.userId!],
    });

    const transactions = result.rows.map((row) => {
      const item = row as TransactionRow;
      return {
        ...item,
        id: Number(item.id),
        user_id: Number(item.user_id),
        amount: Number(item.amount),
      };
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "يرجى تسجيل الدخول";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
