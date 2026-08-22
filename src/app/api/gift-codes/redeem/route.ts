import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type DbRow = Record<string, unknown>;
type GiftCodeBody = { code?: unknown };

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const body = await request.json() as GiftCodeBody;
    const code = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return NextResponse.json({ error: "أدخل كود الهدية" }, { status: 400 });
    const userId = Number(session.userId);
    if (!Number.isInteger(userId) || userId <= 0) return NextResponse.json({ error: "جلسة المستخدم غير صالحة" }, { status: 401 });

    const existing = await db.execute({ sql: "SELECT id FROM gift_code_redemptions WHERE code_id=(SELECT id FROM gift_codes WHERE code=?) AND user_id=?", args: [code, userId] });
    if (existing.rows.length) return NextResponse.json({ error: "لقد استخدمت هذا الكود من قبل" }, { status: 409 });

    const found = await db.execute({ sql: "SELECT id, amount FROM gift_codes WHERE code=? AND is_active=1 AND (max_uses=0 OR used_count<max_uses) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)", args: [code] });
    const gift = found.rows[0] as DbRow | undefined;
    if (!gift) return NextResponse.json({ error: "الكود غير صالح أو منتهي أو استُنفدت استخداماته" }, { status: 404 });

    // الحجز والاسترداد وزيادة الرصيد داخل batch واحدة؛ إذا فشل أي جزء تتراجع العملية كاملة.
    const results = await db.batch([
      { sql: "UPDATE gift_codes SET used_count=used_count+1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND is_active=1 AND (max_uses=0 OR used_count<max_uses) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)", args: [Number(gift.id)] },
      { sql: "INSERT INTO gift_code_redemptions (code_id, user_id, amount) VALUES (?,?,?)", args: [Number(gift.id), userId, Number(gift.amount)] },
      { sql: "UPDATE users SET balance=COALESCE(balance,0)+? WHERE id=?", args: [Number(gift.amount), userId] },
      { sql: "INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?,?,?,?,?)", args: [userId, "gift_code", Number(gift.amount), `استرداد كود هدية: ${code}`, "completed"] },
    ], "write");
    if (Number(results[0]?.rowsAffected || 0) !== 1) {
      return NextResponse.json({ error: "انتهت استخدامات هذا الكود، حاول بكود آخر" }, { status: 409 });
    }

    const balance = await db.execute({ sql: "SELECT balance FROM users WHERE id=?", args: [userId] });
    return NextResponse.json({ ok: true, credited: Number(gift.amount), balance: Number((balance.rows[0] as DbRow | undefined)?.balance || 0) });
  } catch (error) {
    const message = error instanceof Error && error.message === "Unauthorized" ? error.message : "تعذر استرداد الكود";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
