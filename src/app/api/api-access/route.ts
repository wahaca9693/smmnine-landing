import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

function genKey() {
  return "smm-" + randomBytes(24).toString("hex");
}

export async function GET() {
  try {
    const session = await requireAuth();
    const res = await db.execute({
      sql: "SELECT id, api_key, name, requests_count, last_used_at, is_active, created_at FROM api_keys WHERE user_id = ? ORDER BY id DESC",
      args: [session.userId!],
    });
    return NextResponse.json({ keys: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { name } = await request.json().catch(() => ({}));
    // لا يسمح بأكثر من 3 مفاتيح لكل مستخدم
    const count = await db.execute({ sql: "SELECT COUNT(*) AS c FROM api_keys WHERE user_id = ?", args: [session.userId!] });
    if (Number((count.rows[0] as any).c) >= 3) {
      return NextResponse.json({ error: "الحد الأقصى 3 مفاتيح لكل مستخدم" }, { status: 400 });
    }
    const apiKey = genKey();
    await db.execute({
      sql: "INSERT INTO api_keys (user_id, api_key, name) VALUES (?, ?, ?)",
      args: [session.userId!, apiKey, name || "مفتاحي الرئيسي"],
    });
    return NextResponse.json({ message: "تم إنشاء المفتاح", apiKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// تجديد / إلغاء المفتاح
export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const { id, action } = await request.json();
    if (action === "revoke") {
      await db.execute({ sql: "UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?", args: [id, session.userId!] });
      return NextResponse.json({ message: "تم إلغاء المفتاح" });
    }
    if (action === "regenerate") {
      await db.execute({ sql: "UPDATE api_keys SET api_key = ?, requests_count = 0 WHERE id = ? AND user_id = ?", args: [genKey(), id, session.userId!] });
      const fresh = await db.execute({ sql: "SELECT api_key FROM api_keys WHERE id = ? AND user_id = ?", args: [id, session.userId!] });
      return NextResponse.json({ message: "تم تجديد المفتاح", apiKey: (fresh.rows[0] as any)?.api_key });
    }
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
