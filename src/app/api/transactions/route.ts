import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
      args: [session.userId!],
    });

    const transactions = result.rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      user_id: Number(row.user_id),
      amount: Number(row.amount),
    }));

    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
