import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshOrderStatus } from "@/lib/order-status-refresh";

type SqlArg = string | number | null;
type DbRow = Record<string, unknown>;

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" || message === "Account banned" ? 403 : 500;
  return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تنفيذ العملية" }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    if (userId !== null && (!/^\d+$/.test(userId) || Number(userId) <= 0)) {
      return NextResponse.json({ error: "معرّف المستخدم غير صالح" }, { status: 400 });
    }

    let sql = "SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE 1=1";
    const args: SqlArg[] = [];
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
    const orders = result.rows.map((row) => {
      const item = row as DbRow;
      return {
        id: Number(item.id),
        user_id: Number(item.user_id),
        username: String(item.username || ""),
        smmnine_order_id: item.smmnine_order_id == null ? null : String(item.smmnine_order_id),
        service_id: item.service_id == null ? null : String(item.service_id),
        service_name: String(item.service_name || ""),
        link: String(item.link || ""),
        quantity: Number(item.quantity),
        charge: Number(item.charge),
        status: String(item.status || "Unknown"),
        created_at: item.created_at,
      };
    });
    return NextResponse.json({ orders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as { orderId?: unknown };
    const orderId = Number(body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "رقم الطلب غير صالح" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "SELECT id, user_id, service_id, service_name, public_service_id, provider_id, smmnine_order_id, status, start_count, remains FROM orders WHERE id = ?",
      args: [orderId],
    });
    const row = result.rows[0] as DbRow | undefined;
    if (!row) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    const status = await refreshOrderStatus({
      id: Number(row.id),
      user_id: Number(row.user_id),
      provider_id: row.provider_id,
      service_id: row.service_id,
      public_service_id: row.public_service_id,
      service_name: row.service_name,
      smmnine_order_id: row.smmnine_order_id,
      status: row.status,
      start_count: row.start_count,
      remains: row.remains,
    });

    await db.execute({
      sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)",
      args: [admin.userId ?? null, Number(row.user_id), "refreshOrderStatus", JSON.stringify({ order_id: orderId, status: status.status })],
    });

    return NextResponse.json({ ...status, order_id: orderId });
  } catch (error) {
    return errorResponse(error);
  }
}
