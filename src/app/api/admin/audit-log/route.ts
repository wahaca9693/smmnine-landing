import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type DbRow = Record<string, unknown>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden" || message === "Account banned") return 403;
  return 500;
}

function safeDetails(value: unknown) {
  const text = String(value || "");
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const copy = { ...parsed } as Record<string, unknown>;
      for (const key of Object.keys(copy)) {
        if (/password|token|secret|key/i.test(key)) copy[key] = "[محمي]";
      }
      return JSON.stringify(copy);
    }
  } catch {
    // سجل قديم غير JSON؛ أبقه نصًا كما هو.
  }
  return text;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const action = (searchParams.get("action") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const from = (searchParams.get("from") || "").trim();
    const to = (searchParams.get("to") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));
    const args: Array<string | number> = [];
    let where = " WHERE 1 = 1 ";

    if (action) {
      where += " AND l.action = ?";
      args.push(action);
    }
    if (search) {
      where += " AND (target.username LIKE ? OR admin.username LIKE ? OR CAST(l.target_user_id AS TEXT) LIKE ?)";
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where += " AND datetime(l.created_at) >= datetime(?)";
      args.push(`${from} 00:00:00`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      where += " AND datetime(l.created_at) < datetime(?, '+1 day')";
      args.push(`${to} 00:00:00`);
    }

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM admin_audit_logs l LEFT JOIN users target ON target.id = l.target_user_id LEFT JOIN users admin ON admin.id = l.admin_user_id ${where}`,
      args,
    });
    const total = Number((countResult.rows[0] as DbRow | undefined)?.total || 0);
    const offset = (page - 1) * limit;
    const result = await db.execute({
      sql: `
        SELECT l.id, l.action, l.details, l.created_at,
               l.admin_user_id, admin.username AS admin_username,
               l.target_user_id, target.username AS target_username
        FROM admin_audit_logs l
        LEFT JOIN users target ON target.id = l.target_user_id
        LEFT JOIN users admin ON admin.id = l.admin_user_id
        ${where}
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset],
    });

    const actionResult = await db.execute("SELECT action, COUNT(*) AS total FROM admin_audit_logs GROUP BY action ORDER BY total DESC");
    return json({
      logs: result.rows.map((row) => {
        const item = row as DbRow;
        return {
          ...item,
          id: Number(item.id),
          admin_user_id: item.admin_user_id == null ? null : Number(item.admin_user_id),
          target_user_id: item.target_user_id == null ? null : Number(item.target_user_id),
          details: safeDetails(item.details),
        };
      }),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      actions: actionResult.rows.map((row) => {
        const item = row as DbRow;
        return { action: String(item.action), total: Number(item.total || 0) };
      }),
    });
  } catch (error) {
    const status = errorStatus(error instanceof Error ? error.message : "");
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل سجل التدقيق" }, status);
  }
}
