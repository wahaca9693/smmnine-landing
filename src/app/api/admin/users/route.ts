import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type DbRow = Record<string, unknown>;
type QueryValue = string | number;

type ListFilters = {
  search: string;
  status: "all" | "active" | "banned";
  sort: "created_desc" | "created_asc" | "balance_desc" | "balance_asc" | "username_asc";
};

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
    orders_count: Number(row.orders_count || 0),
    created_at: row.created_at,
  };
}

function parsePage(value: string | null, fallback: number) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(value: string | null) {
  const parsed = Number(value || 25);
  return Number.isInteger(parsed) ? Math.min(100, Math.max(10, parsed)) : 25;
}

function parseFilters(searchParams: URLSearchParams): ListFilters {
  const requestedStatus = searchParams.get("status");
  const requestedSort = searchParams.get("sort");
  return {
    search: (searchParams.get("search") || "").trim().slice(0, 100),
    status: requestedStatus === "active" || requestedStatus === "banned" ? requestedStatus : "all",
    sort: ["created_desc", "created_asc", "balance_desc", "balance_asc", "username_asc"].includes(String(requestedSort))
      ? (requestedSort as ListFilters["sort"])
      : "created_desc",
  };
}

function buildUserWhere(filters: ListFilters) {
  const args: QueryValue[] = [];
  let where = " WHERE u.role != 'admin' ";
  if (filters.search) {
    where += " AND (u.username LIKE ? OR u.email LIKE ? OR CAST(u.id AS TEXT) LIKE ?) ";
    args.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.status === "banned") where += " AND (u.is_banned = 1 OR u.status = 'banned') ";
  if (filters.status === "active") where += " AND u.is_banned = 0 AND COALESCE(u.status, 'active') != 'banned' ";
  return { where, args };
}

function orderBy(sort: ListFilters["sort"]) {
  switch (sort) {
    case "created_asc": return "u.created_at ASC, u.id ASC";
    case "balance_desc": return "u.balance DESC, u.id DESC";
    case "balance_asc": return "u.balance ASC, u.id ASC";
    case "username_asc": return "LOWER(u.username) ASC, u.id ASC";
    case "created_desc":
    default: return "u.created_at DESC, u.id DESC";
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvResponse(rows: DbRow[]) {
  const header = ["id", "username", "email", "balance", "status", "orders_count", "created_at"];
  const body = rows.map((row) => [
    row.id,
    row.username,
    row.email,
    Number(row.balance || 0).toFixed(6),
    Number(row.is_banned || 0) ? "banned" : String(row.status || "active"),
    Number(row.orders_count || 0),
    row.created_at,
  ].map(csvCell).join(","));
  return new Response(`\uFEFF${[header.join(","), ...body].join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="follower-users.csv"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
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
    const filters = parseFilters(searchParams);
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

    const { where, args } = buildUserWhere(filters);
    const requestedPage = parsePage(searchParams.get("page"), 1);
    const limit = parseLimit(searchParams.get("limit"));
    const statsRes = await db.execute({
      sql: "SELECT COUNT(*) AS total_users, SUM(CASE WHEN is_banned = 1 OR status = 'banned' THEN 1 ELSE 0 END) AS banned_users, SUM(CASE WHEN is_banned = 0 AND COALESCE(status, 'active') != 'banned' THEN 1 ELSE 0 END) AS active_users, COALESCE(SUM(balance), 0) AS total_balance FROM users WHERE role != 'admin'",
      args: [],
    });
    const countRes = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM users u ${where}`,
      args,
    });
    const total = Number((countRes.rows[0] as DbRow | undefined)?.total || 0);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const offset = (page - 1) * limit;
    const listSql = `
      SELECT u.id, u.username, u.email, u.balance, u.role, u.is_banned, u.status, u.terms_accepted, u.created_at,
             COUNT(o.id) AS orders_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      ${where}
      GROUP BY u.id, u.username, u.email, u.balance, u.role, u.is_banned, u.status, u.terms_accepted, u.created_at
      ORDER BY ${orderBy(filters.sort)}
      LIMIT ? OFFSET ?
    `;
    const result = await db.execute({ sql: listSql, args: [...args, limit, offset] });
    const stats = statsRes.rows[0] as DbRow | undefined;

    if (searchParams.get("format") === "csv") {
      const exportResult = await db.execute({ sql: listSql.replace("LIMIT ? OFFSET ?", "LIMIT 5000 OFFSET 0"), args });
      return csvResponse(exportResult.rows as DbRow[]);
    }

    return json({
      users: result.rows.map((row) => safeUser(row as DbRow)),
      page,
      limit,
      total,
      pages,
      filters,
      stats: {
        total_users: Number(stats?.total_users || 0),
        active_users: Number(stats?.active_users || 0),
        banned_users: Number(stats?.banned_users || 0),
        total_balance: Number(stats?.total_balance || 0),
      },
    });
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

    if (action === "bulkBan" || action === "bulkUnban") {
      const rawIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = [...new Set(rawIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))].slice(0, 100);
      if (ids.length === 0) return json({ error: "اختر مستخدمًا واحدًا على الأقل" }, 400);
      const placeholders = ids.map(() => "?").join(",");
      const targets = await db.execute({ sql: `SELECT id FROM users WHERE id IN (${placeholders}) AND role != 'admin'`, args: ids });
      const validIds = targets.rows.map((row) => Number((row as DbRow).id)).filter((id) => Number.isInteger(id));
      if (validIds.length === 0) return json({ error: "لا توجد حسابات صالحة ضمن الاختيار" }, 400);
      const banned = action === "bulkBan" ? 1 : 0;
      const transaction = await db.transaction("write");
      try {
        const validPlaceholders = validIds.map(() => "?").join(",");
        await transaction.execute({ sql: `UPDATE users SET is_banned = ?, status = ? WHERE id IN (${validPlaceholders}) AND role != 'admin'`, args: [banned, banned ? "banned" : "active", ...validIds] });
        for (const targetId of validIds) {
          await transaction.execute({
            sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)",
            args: [admin.userId ?? null, targetId, action, JSON.stringify({ bulk: true, selected_count: validIds.length })],
          });
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback().catch(() => undefined);
        throw error;
      }
      return json({ success: true, affected: validIds.length, message: `تم تحديث ${validIds.length} حساب` });
    }

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
      const transaction = await db.transaction("write");
      try {
        const updated = await transaction.execute({
          sql: action === "subtractBalance"
            ? "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?"
            : "UPDATE users SET balance = balance + ? WHERE id = ?",
          args: action === "subtractBalance" ? [amount, uid, amount] : [amount, uid],
        });
        if (Number(updated.rowsAffected || 0) !== 1) throw new Error("BALANCE_CONFLICT");
        await transaction.execute({
          sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'admin')",
          args: [uid, delta, delta > 0 ? `إضافة رصيد من الأدمن #${admin.userId}` : `خصم رصيد من الأدمن #${admin.userId}`],
        });
        await transaction.execute({
          sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)",
          args: [admin.userId ?? null, uid, action, JSON.stringify({ amount: delta, previous_balance: current, new_balance: current + delta })],
        });
        await transaction.commit();
      } catch (error: unknown) {
        await transaction.rollback().catch(() => undefined);
        if (error instanceof Error && error.message === "BALANCE_CONFLICT") return json({ error: "تغيّر الرصيد أو لم يعد كافيًا؛ أعد المحاولة" }, 409);
        throw error;
      }
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
