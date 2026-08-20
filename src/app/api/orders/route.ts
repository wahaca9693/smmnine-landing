import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type OrderRow = Record<string, unknown>;

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = "SELECT * FROM orders WHERE user_id = ?";
    const args: Array<string | number> = [session.userId!];

    if (status && status !== "all") {
      sql += " AND status = ?";
      args.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });
    const orders = result.rows.map((row) => {
      const item = row as OrderRow;
      return {
        ...item,
        id: Number(item.id),
        user_id: Number(item.user_id),
        smmnine_order_id: Number(item.smmnine_order_id),
        service_id: Number(item.service_id),
        charge: Number(item.charge),
        quantity: Number(item.quantity),
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "يرجى تسجيل الدخول";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
