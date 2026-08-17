import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, action } = await request.json();
    if (action === "toggle") {
      const cur = await db.execute({ sql: "SELECT is_active FROM api_keys WHERE id = ?", args: [id] });
      const val = cur.rows[0] ? (Number((cur.rows[0] as any).is_active) ? 0 : 1) : null;
      if (val === null) return NextResponse.json({ error: "المفتاح غير موجود" }, { status: 404 });
      await db.execute({ sql: "UPDATE api_keys SET is_active = ? WHERE id = ?", args: [val, id] });
      return NextResponse.json({ message: val ? "تم تفعيل المفتاح" : "تم تعطيل المفتاح" });
    }
    if (action === "delete") {
      await db.execute({ sql: "DELETE FROM api_keys WHERE id = ?", args: [id] });
      return NextResponse.json({ message: "تم حذف المفتاح" });
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
