import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id");
    const methods = result.rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      min_amount: Number(row.min_amount),
      is_active: Number(row.is_active),
    }));
    return NextResponse.json({ methods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { methodId, amount, notes } = await request.json();

    if (!methodId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "يرجى إدخال طريقة الدفع والمبلغ" }, { status: 400 });
    }

    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
      args: [session.userId!, "deposit", amount, "pending", `طلب شحن رصيد - ${notes || ""}`],
    });

    return NextResponse.json({ message: "تم إرسال طلب الشحن، سيتم المراجعة قريباً" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
