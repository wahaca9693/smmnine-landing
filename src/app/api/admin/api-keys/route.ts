import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateApiKeyCache } from "@/lib/api-key-cache";

type DbRow = Record<string, unknown>;
type QueryValue = string | number;

function authErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden" || message === "Account banned") return 403;
  return 500;
}

function responseForError(error: unknown) {
  const status = authErrorStatus(error);
  return NextResponse.json(
    { error: status === 500 ? "تعذر إكمال العملية حاليًا" : status === 401 ? "غير مصرح" : "ممنوع" },
    { status, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

function pageValue(value: string | null, fallback: number) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function limitValue(value: string | null) {
  const parsed = Number(value || 25);
  return Number.isInteger(parsed) ? Math.min(100, Math.max(10, parsed)) : 25;
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvResponse(rows: DbRow[]) {
  const header = ["id", "user_id", "username", "name", "key_hint", "status", "requests_count", "last_used_at", "created_at"];
  const body = rows.map((row) => [
    row.id,
    row.user_id,
    row.username,
    row.name,
    row.key_hint,
    Number(row.is_active || 0) ? "active" : "disabled",
    row.requests_count,
    row.last_used_at,
    row.created_at,
  ].map(csvCell).join(","));
  return new Response(`\uFEFF${[header.join(","), ...body].join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"follower-api-keys.csv\"",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function keyWhere(search: string, status: string) {
  const args: QueryValue[] = [];
  let where = " WHERE 1 = 1 ";
  if (search) {
    where += " AND (u.username LIKE ? OR u.email LIKE ? OR CAST(ak.id AS TEXT) LIKE ? OR ak.name LIKE ?) ";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status === "active") where += " AND ak.is_active = 1 ";
  if (status === "disabled") where += " AND ak.is_active = 0 ";
  return { where, args };
}

function safeKey(row: DbRow) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    username: String(row.username || "—"),
    name: String(row.name || "مفتاح API"),
    key_hint: String(row.key_hint || "••••"),
    is_active: Number(row.is_active || 0),
    requests_count: Number(row.requests_count || 0),
    last_used_at: row.last_used_at,
    created_at: row.created_at,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().slice(0, 100);
    const status = searchParams.get("status") === "active" || searchParams.get("status") === "disabled" ? String(searchParams.get("status")) : "all";
    const { where, args } = keyWhere(search, status);
    const limit = limitValue(searchParams.get("limit"));
    const requestedPage = pageValue(searchParams.get("page"), 1);
    const countRes = await db.execute({ sql: `SELECT COUNT(*) AS total FROM api_keys ak LEFT JOIN users u ON u.id = ak.user_id ${where}`, args });
    const total = Number((countRes.rows[0] as DbRow | undefined)?.total || 0);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const offset = (page - 1) * limit;
    const listSql = `
      SELECT ak.id, ak.user_id, ak.name, ak.is_active, ak.requests_count, ak.last_used_at, ak.created_at,
             u.username, substr(ak.api_key, 1, 6) || '••••' || substr(ak.api_key, -4) AS key_hint
      FROM api_keys ak
      LEFT JOIN users u ON u.id = ak.user_id
      ${where}
      ORDER BY ak.id DESC
      LIMIT ? OFFSET ?
    `;
    const result = await db.execute({ sql: listSql, args: [...args, limit, offset] });
    const statsRes = await db.execute({
      sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS disabled, COALESCE(SUM(requests_count), 0) AS requests FROM api_keys",
      args: [],
    });
    const statsRow = statsRes.rows[0] as DbRow | undefined;

    if (searchParams.get("format") === "csv") {
      const exportRes = await db.execute({ sql: listSql.replace("LIMIT ? OFFSET ?", "LIMIT 5000 OFFSET 0"), args });
      return csvResponse(exportRes.rows as DbRow[]);
    }

    return NextResponse.json({
      keys: result.rows.map((row) => safeKey(row as DbRow)),
      page,
      pages,
      limit,
      total,
      filters: { search, status },
      stats: {
        total: Number(statsRow?.total || 0),
        active: Number(statsRow?.active || 0),
        disabled: Number(statsRow?.disabled || 0),
        requests: Number(statsRow?.requests || 0),
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: unknown) {
    return responseForError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as { id?: unknown; action?: unknown; keyIds?: unknown };
    const action = String(body.action || "");

    if (action === "bulkDisable") {
      const rawIds = Array.isArray(body.keyIds) ? body.keyIds : [];
      const ids = [...new Set(rawIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))].slice(0, 100);
      if (ids.length === 0) return NextResponse.json({ error: "اختر مفتاحًا واحدًا على الأقل" }, { status: 400 });
      const placeholders = ids.map(() => "?").join(",");
      const targets = await db.execute({ sql: `SELECT id, user_id FROM api_keys WHERE id IN (${placeholders})`, args: ids });
      const rows = targets.rows as DbRow[];
      if (rows.length === 0) return NextResponse.json({ error: "لا توجد مفاتيح صالحة ضمن الاختيار" }, { status: 404 });
      const transaction = await db.transaction("write");
      try {
        await transaction.execute({ sql: `UPDATE api_keys SET is_active = 0 WHERE id IN (${placeholders})`, args: rows.map((row) => Number(row.id)) });
        for (const row of rows) {
          await transaction.execute({ sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)", args: [admin.userId ?? null, Number(row.user_id), "bulkDisableApiKey", JSON.stringify({ api_key_id: Number(row.id) })] });
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback().catch(() => undefined);
        throw error;
      }
      invalidateApiKeyCache();
      return NextResponse.json({ success: true, affected: rows.length, message: `تم تعطيل ${rows.length} مفتاح` });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف المفتاح غير صالح" }, { status: 400 });
    if (action === "toggle") {
      const cur = await db.execute({ sql: "SELECT is_active, user_id FROM api_keys WHERE id = ?", args: [id] });
      const row = cur.rows[0] as DbRow | undefined;
      if (!row) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });
      const val = Number(row.is_active) ? 0 : 1;
      await db.execute({ sql: "UPDATE api_keys SET is_active = ? WHERE id = ?", args: [val, id] });
      await db.execute({ sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)", args: [admin.userId ?? null, Number(row.user_id), val ? "enableApiKey" : "disableApiKey", JSON.stringify({ api_key_id: id })] });
      invalidateApiKeyCache();
      return NextResponse.json({ message: val ? "تم تفعيل المفتاح" : "تم تعطيل المفتاح" });
    }
    if (action === "delete") {
      const existing = await db.execute({ sql: "SELECT user_id FROM api_keys WHERE id = ?", args: [id] });
      const row = existing.rows[0] as DbRow | undefined;
      const deleted = await db.execute({ sql: "DELETE FROM api_keys WHERE id = ?", args: [id] });
      if (Number(deleted.rowsAffected || 0) !== 1) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });
      await db.execute({ sql: "INSERT INTO admin_audit_logs (admin_user_id, target_user_id, action, details) VALUES (?, ?, ?, ?)", args: [admin.userId ?? null, Number(row?.user_id || 0) || null, "deleteApiKey", JSON.stringify({ api_key_id: id, deleted: true })] });
      invalidateApiKeyCache();
      return NextResponse.json({ message: "تم حذف المفتاح" });
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error: unknown) {
    return responseForError(error);
  }
}
