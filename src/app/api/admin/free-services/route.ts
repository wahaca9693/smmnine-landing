import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { findCatalogService, loadServiceCatalog } from "@/lib/service-catalog";

type JsonRecord = Record<string, unknown>;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "حدث خطأ";
  return json({ error: message }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requireAdmin();
    await initDb();
    const [offersResult, catalog] = await Promise.all([
      db.execute({ sql: "SELECT * FROM free_service_offers ORDER BY is_active DESC, updated_at DESC, id DESC", args: [] }),
      loadServiceCatalog(),
    ]);
    return json({ offers: offersResult.rows, catalog });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const adminUserId = Number(session.userId);
    if (!Number.isInteger(adminUserId) || adminUserId <= 0) return json({ error: "جلسة الإدارة غير صالحة" }, { status: 401 });
    await initDb();
    const body = await request.json() as JsonRecord;
    const action = String(body.action ?? "create").trim();
    const offerId = numberValue(body.id);

    if (action === "toggle") {
      if (!offerId) return json({ error: "معرّف العرض غير صالح" }, { status: 400 });
      const current = await db.execute({ sql: "SELECT is_active FROM free_service_offers WHERE id = ?", args: [offerId] });
      if (!current.rows[0]) return json({ error: "العرض غير موجود" }, { status: 404 });
      const isActive = Number((current.rows[0] as unknown as JsonRecord).is_active) === 1;
      await db.execute({ sql: "UPDATE free_service_offers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [isActive ? 0 : 1, offerId] });
      return json({ ok: true, is_active: isActive ? 0 : 1 });
    }

    if (action === "delete") {
      if (!offerId) return json({ error: "معرّف العرض غير صالح" }, { status: 400 });
      const deleted = await db.execute({ sql: "DELETE FROM free_service_offers WHERE id = ?", args: [offerId] });
      if (Number(deleted.rowsAffected || 0) !== 1) return json({ error: "العرض غير موجود" }, { status: 404 });
      return json({ ok: true });
    }

    const serviceId = String(body.serviceId ?? "").trim();
    if (!serviceId) return json({ error: "يجب اختيار خدمة مجانية" }, { status: 400 });
    const catalogService = await findCatalogService(serviceId);
    if (!catalogService) return json({ error: "الخدمة غير موجودة أو غير نشطة" }, { status: 404 });

    const minQuantity = numberValue(body.minQuantity, catalogService.min);
    const maxQuantity = numberValue(body.maxQuantity, catalogService.max);
    const cooldownHours = numberValue(body.cooldownHours, 24);
    if (!Number.isInteger(minQuantity) || !Number.isInteger(maxQuantity) || minQuantity <= 0 || maxQuantity < minQuantity) {
      return json({ error: "حدود الكمية غير صالحة" }, { status: 400 });
    }
    if (minQuantity < catalogService.min || maxQuantity > catalogService.max) {
      return json({ error: `يجب أن تكون الكمية بين ${catalogService.min} و${catalogService.max} حسب حدود الخدمة الأصلية` }, { status: 400 });
    }
    if (!Number.isFinite(cooldownHours) || cooldownHours < 1 || cooldownHours > 720) {
      return json({ error: "مدة إعادة الاستخدام يجب أن تكون بين ساعة واحدة و720 ساعة" }, { status: 400 });
    }

    if (action === "update") {
      if (!offerId) return json({ error: "معرّف العرض غير صالح" }, { status: 400 });
      const updated = await db.execute({
        sql: `UPDATE free_service_offers
              SET service_id = ?, service_name = ?, source = ?, provider_id = ?, provider_service_id = ?,
                  min_quantity = ?, max_quantity = ?, cooldown_hours = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [catalogService.serviceId, catalogService.name, catalogService.source, catalogService.providerId, catalogService.providerServiceId, minQuantity, maxQuantity, cooldownHours, offerId],
      });
      if (Number(updated.rowsAffected || 0) !== 1) return json({ error: "العرض غير موجود" }, { status: 404 });
      return json({ ok: true });
    }

    const inserted = await db.execute({
      sql: `INSERT INTO free_service_offers
            (service_id, service_name, source, provider_id, provider_service_id, min_quantity, max_quantity, cooldown_hours, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [catalogService.serviceId, catalogService.name, catalogService.source, catalogService.providerId, catalogService.providerServiceId, minQuantity, maxQuantity, cooldownHours, adminUserId],
    });
    return json({ ok: true, id: Number(inserted.lastInsertRowid) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "حدث خطأ";
    if (message.includes("UNIQUE constraint failed")) return json({ error: "هذه الخدمة مضافة إلى قسم المجاني مسبقًا" }, { status: 409 });
    return authError(error);
  }
}
