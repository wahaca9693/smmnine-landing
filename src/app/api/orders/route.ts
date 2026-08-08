import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = "SELECT * FROM orders WHERE user_id = ?";
    const args: any[] = [session.userId!];

    if (status && status !== "all") {
      sql += " AND status = ?";
      args.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });
    const orders = result.rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      user_id: Number(row.user_id),
      smmnine_order_id: Number(row.smmnine_order_id),
      service_id: Number(row.service_id),
      charge: Number(row.charge),
      quantity: Number(row.quantity),
    }));

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
