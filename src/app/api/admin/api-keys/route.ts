import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

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
      SELECT ak.*, u.username
      FROM api_keys ak
      LEFT JOIN users u ON u.id = ak.user_id
      ORDER BY ak.id DESC
    `);
    return NextResponse.json({ keys: res.rows });
  } catch (error: unknown) {
    return responseForError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, action } = await request.json();
    if (action === "toggle") {
      const cur = await db.execute({ sql: "SELECT is_active FROM api_keys WHERE id = ?", args: [id] });
      const row = cur.rows[0] as Record<string, unknown> | undefined;
      const val = row ? (Number(row.is_active) ? 0 : 1) : null;
      if (val === null) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });
      await db.execute({ sql: "UPDATE api_keys SET is_active = ? WHERE id = ?", args: [val, id] });
      return NextResponse.json({ message: val ? "تم تفعيل المفتاح" : "تم تعطيل المفتاح" });
    }
    if (action === "delete") {
      await db.execute({ sql: "DELETE FROM api_keys WHERE id = ?", args: [id] });
      return NextResponse.json({ message: "تم حذف المفتاح" });
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error: unknown) {
    return responseForError(error);
  }
}
