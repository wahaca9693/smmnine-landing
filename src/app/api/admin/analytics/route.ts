import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsRange = "today" | "7d" | "30d" | "90d" | "all";
type Row = Record<string, unknown>;
type AsiacellStatusRow = {
  authenticated?: unknown;
  access_token?: unknown;
  updated_at?: unknown;
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

function numberValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function rangeCondition(range: AnalyticsRange, column: string): string {
  switch (range) {
    case "today":
      return `${column} >= date('now')`;
    case "7d":
      return `${column} >= datetime('now', '-7 day')`;
    case "90d":
      return `${column} >= datetime('now', '-90 day')`;
    case "30d":
      return `${column} >= datetime('now', '-30 day')`;
    case "all":
    default:
      return "1 = 1";
  }
}

function serializeRows(rows: Row[]) {
  return rows.map((row) => {
    const output: Record<string, unknown> = { ...row };
    for (const [key, value] of Object.entries(output)) {
      if (typeof value === "bigint") output[key] = Number(value);
    }
    return output;
  });
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const admin = await db.execute({
      sql: "SELECT role FROM users WHERE id = ? LIMIT 1",
      args: [session.userId!],
    });
    if (String((admin.rows[0] as Row | undefined)?.role || "") !== "admin") {
      return json({ error: "غير مصرح" }, { status: 403 });
    }

    const url = new URL(request.url);
    const requestedRange = url.searchParams.get("range") as AnalyticsRange | null;
    const range: AnalyticsRange = ["today", "7d", "30d", "90d", "all"].includes(String(requestedRange))
      ? (requestedRange as AnalyticsRange)
      : "30d";
    const orderWhere = rangeCondition(range, "o.created_at");
    const transactionWhere = rangeCondition(range, "t.created_at");
    const userWhere = rangeCondition(range, "u.created_at");

    const [summaryRes, topServicesRes, paymentsRes, dailyRes, recentOrdersRes, topUsersRes, auditRes, asiacellRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT
            (SELECT COUNT(*) FROM users WHERE role != 'admin') AS total_users,
            (SELECT COUNT(*) FROM users WHERE role != 'admin' AND is_banned = 1) AS banned_users,
            (SELECT COALESCE(SUM(balance), 0) FROM users WHERE role != 'admin') AS total_balance,
            (SELECT COUNT(*) FROM users u WHERE role != 'admin' AND ${userWhere.replace(/u\./g, "")}) AS new_users,
            (SELECT COUNT(*) FROM orders o WHERE ${orderWhere}) AS total_orders,
            (SELECT COALESCE(SUM(charge), 0) FROM orders o WHERE ${orderWhere}) AS total_sales,
            (SELECT COUNT(*) FROM orders o WHERE ${orderWhere} AND LOWER(COALESCE(status, '')) IN ('pending', 'processing', 'in progress')) AS pending_orders,
            (SELECT COUNT(*) FROM orders o WHERE ${orderWhere} AND LOWER(COALESCE(status, '')) IN ('completed', 'complete', 'success')) AS completed_orders,
            (SELECT COUNT(*) FROM transactions t WHERE ${transactionWhere} AND type = 'deposit') AS deposit_requests,
            (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE ${transactionWhere} AND type = 'deposit' AND LOWER(COALESCE(status, '')) IN ('completed', 'approved', 'success')) AS completed_deposits,
            (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE ${transactionWhere} AND type = 'deposit' AND LOWER(COALESCE(status, '')) = 'pending') AS pending_deposits
        `,
      }),
      db.execute({
        sql: `
          SELECT
            COALESCE(NULLIF(TRIM(service_name), ''), 'خدمة غير مسماة') AS service_name,
            COUNT(*) AS orders_count,
            COALESCE(SUM(quantity), 0) AS total_quantity,
            COALESCE(SUM(charge), 0) AS total_sales
          FROM orders o
          WHERE ${orderWhere}
          GROUP BY COALESCE(NULLIF(TRIM(service_name), ''), 'خدمة غير مسماة')
          ORDER BY orders_count DESC, total_sales DESC
          LIMIT 10
        `,
      }),
      db.execute({
        sql: `
          SELECT
            COALESCE(NULLIF(TRIM(method), ''), 'غير محدد') AS method,
            COUNT(*) AS requests_count,
            COALESCE(SUM(amount), 0) AS requested_amount,
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('completed', 'approved', 'success') THEN amount ELSE 0 END), 0) AS completed_amount,
            COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount
          FROM transactions t
          WHERE ${transactionWhere} AND type = 'deposit'
          GROUP BY COALESCE(NULLIF(TRIM(method), ''), 'غير محدد')
          ORDER BY completed_amount DESC, requested_amount DESC
        `,
      }),
      db.execute({
        sql: `
          SELECT
            date(o.created_at) AS day,
            COUNT(*) AS orders_count,
            COALESCE(SUM(o.charge), 0) AS sales
          FROM orders o
          WHERE ${orderWhere}
          GROUP BY date(o.created_at)
          ORDER BY day ASC
          LIMIT 31
        `,
      }),
      db.execute({
        sql: `
          SELECT
            o.id,
            o.service_name,
            o.quantity,
            o.charge,
            o.status,
            o.created_at,
            u.username
          FROM orders o
          JOIN users u ON u.id = o.user_id
          WHERE ${orderWhere}
          ORDER BY o.created_at DESC
          LIMIT 12
        `,
      }),
      db.execute({
        sql: `
          SELECT
            u.id,
            u.username,
            u.balance,
            u.created_at,
            COUNT(o.id) AS orders_count,
            COALESCE(SUM(o.charge), 0) AS orders_value
          FROM users u
          LEFT JOIN orders o ON o.user_id = u.id AND ${orderWhere.replace(/o\./g, "o.")}
          WHERE u.role != 'admin'
          GROUP BY u.id, u.username, u.balance, u.created_at
          ORDER BY orders_value DESC, orders_count DESC, u.created_at DESC
          LIMIT 8
        `,
      }),
      db.execute({
        sql: `
          SELECT l.id, l.action, l.details, l.created_at,
                 admin.username AS admin_username, target.username AS target_username
          FROM admin_audit_logs l
          LEFT JOIN users admin ON admin.id = l.admin_user_id
          LEFT JOIN users target ON target.id = l.target_user_id
          ORDER BY l.created_at DESC, l.id DESC
          LIMIT 8
        `,
      }),
      db.execute("SELECT authenticated, access_token, updated_at FROM asiacell_admin WHERE id = 1 LIMIT 1"),
    ]);

    const summaryRow = (summaryRes.rows[0] || {}) as Row;
    const summary = Object.fromEntries(
      Object.entries(summaryRow).map(([key, value]) => [key, numberValue(value)]),
    );

    const asiacellStatus = asiacellRes.rows[0] as unknown as AsiacellStatusRow | undefined;

    return json({
      range,
      generatedAt: new Date().toISOString(),
      summary,
      topServices: serializeRows(topServicesRes.rows as Row[]).map((row) => ({
        ...row,
        orders_count: numberValue(row.orders_count),
        total_quantity: numberValue(row.total_quantity),
        total_sales: numberValue(row.total_sales),
      })),
      payments: serializeRows(paymentsRes.rows as Row[]).map((row) => ({
        ...row,
        requests_count: numberValue(row.requests_count),
        requested_amount: numberValue(row.requested_amount),
        completed_amount: numberValue(row.completed_amount),
        pending_amount: numberValue(row.pending_amount),
      })),
      daily: serializeRows(dailyRes.rows as Row[]).map((row) => ({
        ...row,
        orders_count: numberValue(row.orders_count),
        sales: numberValue(row.sales),
      })),
      recentOrders: serializeRows(recentOrdersRes.rows as Row[]).map((row) => ({
        ...row,
        id: numberValue(row.id),
        quantity: numberValue(row.quantity),
        charge: numberValue(row.charge),
      })),
      topUsers: serializeRows(topUsersRes.rows as Row[]).map((row) => ({
        ...row,
        id: numberValue(row.id),
        balance: numberValue(row.balance),
        orders_count: numberValue(row.orders_count),
        orders_value: numberValue(row.orders_value),
      })),
      system: {
        nowpaymentsConfigured: Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET),
        asiacellConnected: Number(asiacellStatus?.authenticated || 0) === 1 && Boolean(asiacellStatus?.access_token),
        asiacellUpdatedAt: asiacellStatus?.updated_at || null,
        recentActivity: serializeRows(auditRes.rows as Row[]).map((row) => ({
          ...row,
          id: numberValue(row.id),
          action: String(row.action || ""),
          details: row.details ? String(row.details) : "",
        })),
      },
    });
  } catch (error) {
    if (error instanceof Error && /unauthorized/i.test(error.message)) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Analytics]", error);
    return json({ error: error instanceof Error ? error.message : "تعذر تحميل التحليلات" }, { status: 500 });
  }
}
