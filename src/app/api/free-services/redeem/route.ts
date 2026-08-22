import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { cancelOrder, createOrder } from "@/lib/follower";
import { cancelProviderOrder, executeProviderOrder } from "@/lib/providers";
import { findCatalogService, type CatalogService } from "@/lib/service-catalog";

type JsonRecord = Record<string, unknown>;

type FreeErrorOptions = { status: number; retryAfter?: number };
class FreeOrderError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  constructor(message: string, options: FreeErrorOptions) {
    super(message);
    this.name = "FreeOrderError";
    this.status = options.status;
    this.retryAfter = options.retryAfter;
  }
}

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

function errorResponse(error: unknown) {
  if (error instanceof FreeOrderError) {
    return json({ error: error.message, retryAfter: error.retryAfter ?? null }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "حدث خطأ أثناء تنفيذ الهدية";
  const status = message === "Unauthorized" ? 401 : message === "Account banned" ? 403 : 500;
  return json({ error: message }, { status });
}

async function markReservationFailed(reservationId: number) {
  await db.execute({
    sql: "UPDATE free_service_usages SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'reserved'",
    args: [reservationId],
  }).catch(() => undefined);
}

async function cancelRemoteOrder(service: CatalogService, remoteOrderId: string) {
  try {
    if (service.source === "provider" && service.providerId) {
      await cancelProviderOrder(service.providerId, remoteOrderId);
    } else {
      await cancelOrder(remoteOrderId);
    }
  } catch (error) {
    console.error("Free order rollback failed", { remoteOrderId, error });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  let reservationId = 0;
  let service: CatalogService | null = null;
  let remoteOrderId: string | null = null;
  try {
    const session = await requireAuth();
    const userId = Number(session.userId);
    if (!Number.isInteger(userId) || userId <= 0) throw new FreeOrderError("جلسة المستخدم غير صالحة", { status: 401 });
    await initDb();
    const body = await request.json() as JsonRecord;
    const offerId = numberValue(body.offerId);
    const link = String(body.link ?? "").trim();
    const quantity = numberValue(body.quantity);
    const rawIdempotencyKey = request.headers.get("Idempotency-Key") || (typeof body.idempotencyKey === "string" ? body.idempotencyKey : "");
    const idempotencyKey = rawIdempotencyKey.trim();

    if (!offerId || !link || link.length > 2048 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new FreeOrderError("بيانات الهدية غير صالحة", { status: 400 });
    }
    if (idempotencyKey && (idempotencyKey.length < 16 || idempotencyKey.length > 128)) {
      throw new FreeOrderError("مفتاح الطلب غير صالح", { status: 400 });
    }
    if (idempotencyKey) {
      const existingResult = await db.execute({
        sql: "SELECT id, smmnine_order_id, service_name, quantity, status FROM orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1",
        args: [userId, idempotencyKey],
      });
      const existing = existingResult.rows[0] as unknown as JsonRecord | undefined;
      if (existing) {
        return json({
          ok: true,
          replayed: true,
          order: {
            id: Number(existing.id),
            smmnine_order_id: existing.smmnine_order_id ?? null,
            service_name: String(existing.service_name || "خدمة مجانية"),
            quantity: Number(existing.quantity || quantity),
            charge: 0,
            status: String(existing.status || "processing"),
          },
        });
      }
    }

    const offerServiceResult = await db.execute({
      sql: "SELECT service_id FROM free_service_offers WHERE id = ? AND is_active = 1",
      args: [offerId],
    });
    const offerServiceRow = offerServiceResult.rows[0] as unknown as JsonRecord | undefined;
    if (!offerServiceRow) throw new FreeOrderError("العرض المجاني غير متاح", { status: 404 });
    service = await findCatalogService(String(offerServiceRow.service_id));
    if (!service) throw new FreeOrderError("الخدمة الأصلية غير متاحة حاليًا", { status: 409 });

    const transaction = await db.transaction("write");
    try {
      const offerResult = await transaction.execute({
        sql: "SELECT min_quantity, max_quantity, cooldown_hours FROM free_service_offers WHERE id = ? AND is_active = 1",
        args: [offerId],
      });
      const offer = offerResult.rows[0] as unknown as JsonRecord | undefined;
      if (!offer) throw new FreeOrderError("العرض المجاني غير متاح", { status: 404 });

      const minQuantity = numberValue(offer.min_quantity);
      const maxQuantity = numberValue(offer.max_quantity);
      const cooldownHours = numberValue(offer.cooldown_hours, 24);
      if (quantity < minQuantity || quantity > maxQuantity) {
        throw new FreeOrderError(`الكمية المجانية يجب أن تكون بين ${minQuantity} و${maxQuantity}`, { status: 400 });
      }

      const previousResult = await transaction.execute({
        sql: `SELECT cooldown_until FROM free_service_usages
              WHERE offer_id = ? AND user_id = ? AND status <> 'failed'
              ORDER BY id DESC LIMIT 1`,
        args: [offerId, userId],
      });
      const previous = previousResult.rows[0] as unknown as JsonRecord | undefined;
      const cooldownUntilMs = previous?.cooldown_until ? new Date(String(previous.cooldown_until)).getTime() : 0;
      const remainingSeconds = cooldownUntilMs > Date.now() ? Math.ceil((cooldownUntilMs - Date.now()) / 1000) : 0;
      if (remainingSeconds > 0) {
        throw new FreeOrderError(`يمكنك استخدام هذه الهدية مرة أخرى بعد ${remainingSeconds} ثانية`, { status: 429, retryAfter: remainingSeconds });
      }

      const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString();
      const reservation = await transaction.execute({
        sql: `INSERT INTO free_service_usages (offer_id, user_id, quantity, status, cooldown_until)
              VALUES (?, ?, ?, 'reserved', ?)`,
        args: [offerId, userId, quantity, cooldownUntil],
      });
      reservationId = Number(reservation.lastInsertRowid);
      await transaction.commit();
    } finally {
      transaction.close();
    }

    if (!reservationId || !service) throw new FreeOrderError("تعذر حجز الهدية", { status: 500 });

    if (service.source === "provider" && service.providerId) {
      const providerOrder = await executeProviderOrder({
        providerId: service.providerId,
        service: service.remoteServiceId,
        link,
        quantity: String(quantity),
      });
      if (!providerOrder.ok || !providerOrder.remoteOrderId) {
        await markReservationFailed(reservationId);
        throw new FreeOrderError(`تعذر إرسال الهدية إلى المزود: ${providerOrder.error || "خطأ غير معروف"}`, { status: 502 });
      }
      remoteOrderId = providerOrder.remoteOrderId;
    } else {
      const followerOrder = await createOrder(service.remoteServiceId, link, String(quantity));
      remoteOrderId = followerOrder.order ? String(followerOrder.order) : null;
      if (!remoteOrderId) {
        await markReservationFailed(reservationId);
        throw new FreeOrderError("تعذر إرسال الهدية إلى المزود", { status: 502 });
      }
    }

    let localOrderId = 0;
    try {
      const orderResult = await db.execute({
        sql: `INSERT INTO orders (user_id, smmnine_order_id, service_id, service_name, link, quantity, charge, status, provider_id, idempotency_key)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        args: [userId, remoteOrderId, Number(service.providerServiceId ?? service.serviceId), `مجاني — ${service.name}`, link, quantity, service.source === "provider" ? "processing" : "Pending", service.providerId, idempotencyKey || null],
      });
      localOrderId = Number(orderResult.lastInsertRowid);
      if (service.source === "provider" && service.providerId) {
        await db.execute({
          sql: "INSERT INTO provider_order_logs (local_order_id, provider_id, remote_order_id, status) VALUES (?, ?, ?, 'submitted')",
          args: [localOrderId, service.providerId, remoteOrderId],
        });
      }
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, 0, ?, ?)",
        args: [userId, "free_order", "completed", `استخدام خدمة مجانية: ${service.name}`],
      });
      await db.execute({
        sql: "UPDATE free_service_usages SET order_id = ?, status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [localOrderId, reservationId],
      });
        } catch (error) {
      await markReservationFailed(reservationId);
      if (remoteOrderId) await cancelRemoteOrder(service, remoteOrderId);
      if (idempotencyKey && error instanceof Error && /UNIQUE constraint failed.*idempotency|orders\.user_id/.test(error.message)) {
        const replay = await db.execute({ sql: "SELECT id, smmnine_order_id, service_name, quantity, status FROM orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1", args: [userId, idempotencyKey] });
        const existing = replay.rows[0] as unknown as JsonRecord | undefined;
        if (existing) return json({ ok: true, replayed: true, order: { id: Number(existing.id), smmnine_order_id: existing.smmnine_order_id ?? null, service_name: String(existing.service_name || "خدمة مجانية"), quantity: Number(existing.quantity || quantity), charge: 0, status: String(existing.status || "processing") } });
      }
      throw error;
    }
    return json({
      ok: true,
      order: { id: localOrderId, smmnine_order_id: remoteOrderId, service_name: `مجاني — ${service.name}`, quantity, charge: 0 },
    });
  } catch (error) {
    if (reservationId && error instanceof FreeOrderError && error.status >= 500 && remoteOrderId && service) {
      await cancelRemoteOrder(service, remoteOrderId);
      await markReservationFailed(reservationId);
    }
    return errorResponse(error);
  }
}
