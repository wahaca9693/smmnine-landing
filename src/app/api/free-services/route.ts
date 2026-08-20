import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";

type JsonRecord = Record<string, unknown>;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "حدث خطأ";
  return json({ error: message }, { status: message === "Unauthorized" ? 401 : message === "Account banned" ? 403 : 500 });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = Number(session.userId);
    if (!Number.isInteger(userId) || userId <= 0) return json({ error: "جلسة المستخدم غير صالحة" }, { status: 401 });
    await initDb();
    const result = await db.execute({
      sql: `SELECT f.id, f.service_id, f.service_name, f.source, f.min_quantity, f.max_quantity,
                   f.cooldown_hours, f.is_active,
                   (
                     SELECT u.cooldown_until
                     FROM free_service_usages u
                     WHERE u.offer_id = f.id AND u.user_id = ? AND u.status <> 'failed'
                     ORDER BY u.id DESC LIMIT 1
                   ) AS cooldown_until,
                   (
                     SELECT u.quantity
                     FROM free_service_usages u
                     WHERE u.offer_id = f.id AND u.user_id = ? AND u.status <> 'failed'
                     ORDER BY u.id DESC LIMIT 1
                   ) AS last_quantity
            FROM free_service_offers f
            WHERE f.is_active = 1
            ORDER BY f.updated_at DESC, f.id DESC`,
      args: [userId, userId],
    });

    const now = Date.now();
    const offers = (result.rows as unknown as JsonRecord[]).map((row) => {
      const cooldownUntil = row.cooldown_until ? new Date(String(row.cooldown_until)).getTime() : 0;
      const remainingSeconds = cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;
      return {
        id: Number(row.id),
        serviceId: String(row.service_id),
        serviceName: String(row.service_name),
        source: String(row.source),
        minQuantity: Number(row.min_quantity),
        maxQuantity: Number(row.max_quantity),
        cooldownHours: Number(row.cooldown_hours),
        available: remainingSeconds <= 0,
        cooldownUntil: cooldownUntil > 0 ? new Date(cooldownUntil).toISOString() : null,
        remainingSeconds,
        lastQuantity: row.last_quantity == null ? null : Number(row.last_quantity),
      };
    });

    return json({ offers });
  } catch (error) {
    return authError(error);
  }
}
