import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    let sql = "SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE 1=1";
    const args: any[] = [];
    if (userId) {
      sql += " AND o.user_id = ?";
      args.push(Number(userId));
    }
    if (status && status !== "all") {
      sql += " AND o.status = ?";
      args.push(status);
    }
    sql += " ORDER BY o.created_at DESC LIMIT 200";

    const result = await db.execute({ sql, args });
    const orders = result.rows.map((row: any) => ({
      id: Number(row.id),
      user_id: Number(row.user_id),
      username: row.username,
      smmnine_order_id: Number(row.smmnine_order_id),
      service_id: Number(row.service_id),
      service_name: row.service_name,
      link: row.link,
      quantity: Number(row.quantity),
      charge: Number(row.charge),
      status: row.status,
      created_at: row.created_at,
    }));
    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
