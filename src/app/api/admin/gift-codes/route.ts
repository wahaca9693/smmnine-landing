import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function normalizeCode(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function validExpiry(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type GiftCodeBody = {
  action?: string;
  id?: number | string;
  code?: string;
  length?: number | string;
  amount?: number | string;
  unlimited?: boolean;
  max_uses?: number | string;
  expires_at?: string | null;
  kind?: string;
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function errorStatus(error: unknown): number {
  const message = errorText(error);
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden" || message === "Account banned") return 403;
  return 500;
}

export async function GET() {
  try {
    await requireAdmin();
    await initDb();
    const result = await db.execute({ sql: "SELECT * FROM gift_codes ORDER BY created_at DESC, id DESC", args: [] });
    return NextResponse.json({ codes: result.rows });
  } catch (error: unknown) {
    const status = errorStatus(error);
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل الأكواد" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    await initDb();
    const body = (await request.json()) as GiftCodeBody;
    const action = String(body.action || "create");

    if (action === "toggle" || action === "delete") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف الكود غير صالح" }, { status: 400 });
      if (action === "toggle") {
        await db.execute({ sql: "UPDATE gift_codes SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at=CURRENT_TIMESTAMP WHERE id=?", args: [id] });
        return NextResponse.json({ ok: true });
      }
      await db.execute({ sql: "DELETE FROM gift_codes WHERE id=?", args: [id] });
      return NextResponse.json({ ok: true });
    }

    const requested = normalizeCode(body.code);
    const code = requested || randomCode(Math.min(16, Math.max(5, Number(body.length) || 6)));
    if (!/^[A-Z0-9_-]{5,32}$/.test(code)) return NextResponse.json({ error: "الكود يجب أن يكون 5–32 حرفًا أو رقمًا" }, { status: 400 });
    const amount = Number(body.amount);
    const maxUses = body.unlimited === true || body.max_uses === "0" || Number(body.max_uses) === 0 ? 0 : Number(body.max_uses || 1);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "قيمة الرصيد يجب أن تكون أكبر من صفر" }, { status: 400 });
    if (!Number.isInteger(maxUses) || maxUses < 0) return NextResponse.json({ error: "عدد الاستخدامات غير صالح" }, { status: 400 });
    const expiresAt = validExpiry(body.expires_at);
    if (body.expires_at && !expiresAt) return NextResponse.json({ error: "تاريخ الانتهاء غير صالح" }, { status: 400 });

    try {
      await db.execute({
        sql: "INSERT INTO gift_codes (code, kind, amount, max_uses, expires_at, created_by) VALUES (?,?,?,?,?,?)",
        args: [code, String(body.kind || "gift"), amount, maxUses, expiresAt, Number(admin.userId || 0)],
      });
    } catch (error: unknown) {
      if (errorText(error).toLowerCase().includes("unique")) return NextResponse.json({ error: "هذا الكود موجود مسبقًا" }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, code, amount, max_uses: maxUses, expires_at: expiresAt });
  } catch (error: unknown) {
    const status = errorStatus(error);
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تنفيذ العملية" }, { status });
  }
}
