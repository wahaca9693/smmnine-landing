import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateApiKeyCache } from "@/lib/api-key-cache";

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
    { status },
  );
}

export async function GET() {
  try {
    await requireAdmin();
    const res = await db.execute(`
      SELECT ak.id, ak.user_id, ak.is_active, ak.requests_count, ak.last_used_at,
             ak.created_at, u.username
      FROM api_keys ak
      LEFT JOIN users u ON u.id = ak.user_id
      ORDER BY ak.id DESC
    `);
    const keys = res.rows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        ...item,
        id: Number(item.id),
        user_id: Number(item.user_id),
        is_active: Number(item.is_active || 0),
        requests_count: Number(item.requests_count || 0),
      };
    });
    return NextResponse.json({ keys });
  } catch (error: unknown) {
    return responseForError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as { id?: unknown; action?: unknown };
    const id = Number(body.id);
    const action = String(body.action || "");
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف المفتاح غير صالح" }, { status: 400 });
    if (action === "toggle") {
      const cur = await db.execute({ sql: "SELECT is_active FROM api_keys WHERE id = ?", args: [id] });
      const row = cur.rows[0] as Record<string, unknown> | undefined;
      const val = row ? (Number(row.is_active) ? 0 : 1) : null;
      if (val === null) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });
      await db.execute({ sql: "UPDATE api_keys SET is_active = ? WHERE id = ?", args: [val, id] });
      invalidateApiKeyCache();
      return NextResponse.json({ message: val ? "تم تفعيل المفتاح" : "تم تعطيل المفتاح" });
    }
    if (action === "delete") {
      const deleted = await db.execute({ sql: "DELETE FROM api_keys WHERE id = ?", args: [id] });
      if (Number(deleted.rowsAffected || 0) !== 1) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });
      invalidateApiKeyCache();
      return NextResponse.json({ message: "تم حذف المفتاح" });
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error: unknown) {
    return responseForError(error);
  }
}
