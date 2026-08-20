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

function cleanText(value: unknown, max: number) {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= max ? text : "";
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));
    const args: Array<string | number> = [];
    let sql = `
      SELECT n.id, n.user_id, n.title, n.body, n.is_read, n.created_at, u.username
      FROM notifications n
      LEFT JOIN users u ON u.id = n.user_id
      WHERE 1 = 1
    `;
    if (search) {
      sql += " AND (n.title LIKE ? OR n.body LIKE ? OR u.username LIKE ?)";
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY n.created_at DESC LIMIT ?";
    args.push(limit);
    const result = await db.execute({ sql, args });
    const count = await db.execute("SELECT COUNT(*) AS total FROM notifications");
    return json({
      notifications: result.rows.map((row) => {
        const item = row as DbRow;
        return { ...item, id: Number(item.id), user_id: Number(item.user_id), is_read: Number(item.is_read || 0) };
      }),
      total: Number((count.rows[0] as DbRow | undefined)?.total || 0),
    });
  } catch (error) {
    const status = errorStatus(error instanceof Error ? error.message : "");
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل الإشعارات" }, status);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    const title = cleanText(body.title, 120);
    const message = cleanText(body.body, 1000);
    const recipientType = body.recipientType === "user" ? "user" : "broadcast";
    if (!title || !message) return json({ error: "العنوان ونص الإشعار مطلوبان" }, 400);

    if (recipientType === "broadcast") {
      const activeUsers = await db.execute("SELECT COUNT(*) AS total FROM users WHERE role != 'admin' AND COALESCE(is_banned, 0) = 0");
      await db.execute({
        sql: "INSERT INTO notifications (user_id, title, body) SELECT id, ?, ? FROM users WHERE role != 'admin' AND COALESCE(is_banned, 0) = 0",
        args: [title, message],
      });
      const recipientCount = Number((activeUsers.rows[0] as DbRow | undefined)?.total || 0);
      await db.execute({
        sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, NULL, 'broadcastNotification', ?)",
        args: [admin.userId ?? null, JSON.stringify({ title, recipients: recipientCount })],
      });
      return json({ success: true, message: `تم إرسال الإشعار إلى ${recipientCount} مستخدم` });
    }

    const userId = Number(body.userId || 0);
    const username = cleanText(body.username, 80);
    const lookup = userId > 0
      ? await db.execute({ sql: "SELECT id, username, role, is_banned FROM users WHERE id = ?", args: [userId] })
      : await db.execute({ sql: "SELECT id, username, role, is_banned FROM users WHERE username = ?", args: [username] });
    const target = lookup.rows[0] as DbRow | undefined;
    if (!target || String(target.role) === "admin") return json({ error: "المستخدم غير موجود أو محمي" }, 404);
    if (Number(target.is_banned || 0) === 1) return json({ error: "لا يمكن إرسال إشعار إلى مستخدم محظور" }, 400);

    await db.execute({
      sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
      args: [Number(target.id), title, message],
    });
    await db.execute({
      sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, 'userNotification', ?)",
      args: [admin.userId ?? null, Number(target.id), JSON.stringify({ title })],
    });
    return json({ success: true, message: `تم إرسال الإشعار إلى ${String(target.username)}` });
  } catch (error) {
    const status = errorStatus(error instanceof Error ? error.message : "");
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر إرسال الإشعار" }, status);
  }
}
