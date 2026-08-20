import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

function safeUser(row: DbRow) {
  return {
    id: Number(row.id),
    username: String(row.username || ""),
    email: row.email ? String(row.email) : "",
    balance: Number(row.balance || 0),
    role: String(row.role || "user"),
    is_banned: Number(row.is_banned || 0),
    status: String(row.status || "active"),
    terms_accepted: Number(row.terms_accepted || 0),
    created_at: row.created_at,
  };
}

async function audit(adminId: number | undefined, targetId: number, action: string, details: Record<string, unknown> = {}) {
  await db.execute({
    sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)",
    args: [adminId ?? null, targetId, action, JSON.stringify(details)],
  });
}

async function targetExists(userId: number) {
  const result = await db.execute({ sql: "SELECT id, role FROM users WHERE id = ?", args: [userId] });
  const row = result.rows[0] as DbRow | undefined;
  if (!row || String(row.role) === "admin") return false;
  return true;
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const userId = Number(searchParams.get("userId") || 0);

    if (userId > 0) {
      const userRes = await db.execute({
        sql: "SELECT id, username, email, balance, role, is_banned, status, terms_accepted, created_at FROM users WHERE id = ? AND role != 'admin'",
        args: [userId],
      });
      const user = userRes.rows[0] as DbRow | undefined;
      if (!user) return json({ error: "المستخدم غير موجود" }, 404);

      const [ordersRes, transactionsRes, ticketsRes, auditRes] = await Promise.all([
        db.execute({ sql: "SELECT id, service_name, quantity, charge, status, link, created_at, updated_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", args: [userId] }),
        db.execute({ sql: "SELECT id, type, amount, status, description, method, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", args: [userId] }),
        db.execute({ sql: "SELECT id, type, subject, status, admin_reply, created_at, updated_at FROM tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", args: [userId] }),
        db.execute({ sql: "SELECT id, action, details, created_at FROM admin_audit_logs WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 100", args: [userId] }),
      ]);

      return json({
        user: safeUser(user),
        orders: ordersRes.rows,
        transactions: transactionsRes.rows,
        tickets: ticketsRes.rows,
        audit: auditRes.rows.map((row) => { const item = row as DbRow; return { ...item, details: item.details ? String(item.details) : "" }; }),
        viewer: { id: admin.userId },
      });
    }

    let sql = "SELECT id, username, email, balance, role, is_banned, status, created_at FROM users WHERE role != 'admin'";
    const args: Array<string | number> = [];
    if (search) {
      sql += " AND (username LIKE ? OR email LIKE ? OR CAST(id AS TEXT) LIKE ?)";
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC LIMIT 200";
    const result = await db.execute({ sql, args });
    return json({ users: result.rows.map(safeUser) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : (message === "Forbidden" || message === "Account banned" ? 403 : 500);
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل بيانات المستخدمين" }, status);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const uid = Number(body.userId);
    if (!Number.isInteger(uid) || uid <= 0 || !(await targetExists(uid))) return json({ error: "المستخدم غير صالح أو محمي" }, 400);

    if (action === "ban" || action === "unban") {
      const banned = action === "ban" ? 1 : 0;
      await db.execute({ sql: "UPDATE users SET is_banned = ?, status = ? WHERE id = ?", args: [banned, banned ? "banned" : "active", uid] });
      await audit(admin.userId, uid, action);
      return json({ success: true, message: banned ? "تم حظر المستخدم" : "تم فك الحظر عن المستخدم" });
    }

    if (action === "delete") {
      await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [uid] });
      await audit(admin.userId, uid, action, { deleted: true });
      return json({ success: true, message: "تم حذف المستخدم" });
    }

    if (action === "addBalance" || action === "subtractBalance") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return json({ error: "مبلغ غير صالح" }, 400);
      const delta = action === "addBalance" ? amount : -amount;
      const userRes = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [uid] });
      const balanceRow = userRes.rows[0] as DbRow | undefined;
      const current = Number(balanceRow?.balance || 0);
      if (delta < 0 && current + delta < 0) return json({ error: "لا يمكن أن يصبح الرصيد سالبًا" }, 400);
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [delta, uid] });
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'admin')",
        args: [uid, delta, delta > 0 ? `إضافة رصيد من الأدمن #${admin.userId}` : `خصم رصيد من الأدمن #${admin.userId}`],
      });
      await audit(admin.userId, uid, action, { amount: delta, previous_balance: current, new_balance: current + delta });
      return json({ success: true, message: `${delta > 0 ? "تمت إضافة" : "تم خصم"} $${Math.abs(delta).toFixed(6)}`, balance: current + delta });
    }

    if (action === "setPassword") {
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" }, 400);
      const passwordHash = await bcrypt.hash(password, 12);
      await db.execute({ sql: "UPDATE users SET password_hash = ? WHERE id = ?", args: [passwordHash, uid] });
      await audit(admin.userId, uid, action, { password_changed: true });
      return json({ success: true, message: "تم تعيين كلمة مرور جديدة مشفّرة. لا يتم عرضها أو حفظها بصورتها الأصلية." });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : (message === "Forbidden" || message === "Account banned" ? 403 : 500);
    return json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تنفيذ الإجراء" }, status);
  }
}
