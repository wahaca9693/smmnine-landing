import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { cancelOrder, createOrder } from "@/lib/follower";
import { executeProviderOrder } from "@/lib/providers";
import { findCatalogService, findCatalogServiceByPublicId } from "@/lib/service-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonRecord = Record<string, unknown>;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const body = await request.json();
    const serviceId = String(body?.serviceId ?? "").trim();
    const link = String(body?.link ?? "").trim();
    const quantity = body?.quantity;

    if (!serviceId || !link || quantity === undefined || quantity === null || quantity === "") {
      return json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    if (serviceId.length > 128) {
      return json({ error: "معرّف الخدمة غير صالح" }, { status: 400 });
    }
    if (link.length > 2048) {
      return json({ error: "الرابط طويل جدًا" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return json({ error: "الكمية يجب أن تكون رقمًا صحيحًا موجبًا" }, { status: 400 });
    }

    const rawIdempotencyKey = request.headers.get("Idempotency-Key") || (typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "");
    const idempotencyKey = rawIdempotencyKey.trim();
    if (idempotencyKey && (idempotencyKey.length < 16 || idempotencyKey.length > 128)) {
      return json({ error: "مفتاح Idempotency-Key يجب أن يكون بين 16 و128 حرفًا" }, { status: 400 });
    }
    if (idempotencyKey) {
      const existingResult = await db.execute({
        sql: `SELECT id, smmnine_order_id, service_name, charge, status, link, quantity
              FROM orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1`,
        args: [session.userId!, idempotencyKey],
      });
      const existing = existingResult.rows[0] as unknown as JsonRecord | undefined;
      if (existing) {
        return json({
          replayed: true,
          order: {
            id: Number(existing.id),
            smmnine_order_id: existing.smmnine_order_id ?? null,
            service_name: existing.service_name,
            charge: Number(existing.charge),
            status: existing.status,
            link: existing.link,
            quantity: Number(existing.quantity),
          },
        });
      }
    }

    const requestedServiceId = String(serviceId);
    const catalogService = requestedServiceId.startsWith("svc_")
      ? await findCatalogServiceByPublicId(requestedServiceId)
      : await findCatalogService(requestedServiceId);
    const providerService: JsonRecord | undefined = catalogService?.source === "provider"
      ? {
        id: catalogService.providerServiceId,
        remote_service_id: catalogService.remoteServiceId,
        name: catalogService.name,
        min: catalogService.min,
        max: catalogService.max,
        sell_rate: catalogService.rate,
        rate: catalogService.rate,
        provider_id: catalogService.providerId,
      }
      : undefined;

    if (providerService) {
      const min = Number(providerService.min) || 0;
      const max = Number(providerService.max) || Number.MAX_SAFE_INTEGER;
      if (qty < min || qty > max) {
        return json({ error: `الكمية يجب أن تكون بين ${min} و ${max}` }, { status: 400 });
      }

      const storedMarkup = Number(providerService.markup_percent);
      const safeMarkup = Number.isFinite(storedMarkup) && storedMarkup >= 0 ? storedMarkup : 0;
      const sellRate = providerService.sell_rate != null
        ? Number(providerService.sell_rate)
        : Number(providerService.rate) * (1 + safeMarkup / 100);
      const cost = (sellRate * qty) / 1000;
      if (!Number.isFinite(cost) || cost < 0) {
        return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });
      }

      const userResult = await db.execute({
        sql: "SELECT balance FROM users WHERE id = ?",
        args: [session.userId!],
      });
      const balance = Number((userResult.rows[0] as unknown as JsonRecord | undefined)?.balance || 0);
      if (balance < cost) {
        return json({ error: "رصيد غير كافٍ" }, { status: 400 });
      }

      // Reserve the user's wallet before contacting the provider. The conditional
      // update prevents a concurrent request from spending the same balance twice.
      const debit = await db.execute({
        sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
        args: [cost, session.userId!, cost],
      });
      if (Number(debit.rowsAffected || 0) !== 1) {
        return json({ error: "رصيد غير كافٍ أو تغيّر أثناء المعالجة" }, { status: 409 });
      }

      let localOrderId: number | null = null;
      try {
        const orderResult = await db.execute({
          sql: `INSERT INTO orders (user_id, service_id, service_name, link, quantity, charge, status, provider_id, idempotency_key)
                VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?)`,
          args: [session.userId!, Number(providerService.id), String(providerService.name), String(link), qty, cost, Number(providerService.provider_id), idempotencyKey || null],
        });
        localOrderId = Number(orderResult.lastInsertRowid);

        await db.execute({
          sql: "INSERT INTO provider_order_logs (local_order_id, provider_id, remote_order_id, status) VALUES (?, ?, NULL, 'pending')",
          args: [localOrderId, Number(providerService.provider_id)],
        });
      } catch (error) {
        await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, session.userId!] });
        throw error;
      }

      const providerOrder = await executeProviderOrder({
        providerId: Number(providerService.provider_id),
        service: String(providerService.remote_service_id),
        link: String(link),
        quantity: String(qty),
      });

      if (!providerOrder.ok || !providerOrder.remoteOrderId) {
        await db.execute({
          sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
          args: [cost, session.userId!],
        });
        await db.execute({
          sql: "UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [localOrderId],
        });
        await db.execute({
          sql: "UPDATE provider_order_logs SET status = 'failed', error = ? WHERE local_order_id = ?",
          args: [providerOrder.error || "فشل المزود", localOrderId],
        });
        return json({ error: `فشل إنشاء الطلب لدى المزود: ${providerOrder.error || "خطأ غير معروف"}` }, { status: 502 });
      }

      const remoteOrderId = providerOrder.remoteOrderId;
      await db.execute({
        sql: "UPDATE orders SET smmnine_order_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [remoteOrderId, localOrderId],
      });
      await db.execute({
        sql: "UPDATE provider_order_logs SET remote_order_id = ?, status = 'submitted' WHERE local_order_id = ?",
        args: [remoteOrderId, localOrderId],
      });
      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
        args: [session.userId!, "order", -cost, "completed", `طلب #${remoteOrderId} - ${providerService.name}`],
      });

      return json({
        order: {
          id: localOrderId,
          smmnine_order_id: remoteOrderId,
          service_name: providerService.name,
          charge: cost,
          status: "processing",
        },
      });
    }

    // Follower-backed services use the same resolved catalog and never fall back to a stale list.
    const service: JsonRecord | null = catalogService?.source === "follower"
      ? {
        service: catalogService.serviceId,
        name: catalogService.name,
        rate: catalogService.rate,
        min: catalogService.min,
        max: catalogService.max,
      }
      : null;
    if (!service) {
      return json({ error: "الخدمة غير موجودة أو غير نشطة أو معرّفها غير فريد" }, { status: 404 });
    }

    if (qty < Number(service.min) || qty > Number(service.max)) {
      return json({ error: `الكمية يجب أن تكون بين ${service.min} و ${service.max}` }, { status: 400 });
    }

    const cost = (Number(service.rate) * qty) / 1000;
    if (!Number.isFinite(cost) || cost < 0) {
      return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });
    }

    const userResult = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [session.userId!] });
    const balance = Number((userResult.rows[0] as unknown as JsonRecord | undefined)?.balance || 0);
    if (balance < cost) {
      return json({ error: "رصيد غير كافٍ" }, { status: 400 });
    }

    // احجز الرصيد قبل الاتصال بالمزود لمنع إنفاق الرصيد نفسه في طلبين متزامنين.
    const debit = await db.execute({
      sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
      args: [cost, session.userId!, cost],
    });
    if (Number(debit.rowsAffected || 0) !== 1) {
      return json({ error: "رصيد غير كافٍ أو تغيّر أثناء المعالجة" }, { status: 409 });
    }

    let smmnineOrderId: string | null = null;
    try {
      const smmnineResult = await createOrder(String(serviceId), String(link), String(qty));
      smmnineOrderId = smmnineResult.order ? String(smmnineResult.order) : null;
      if (!smmnineOrderId) {
        await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, session.userId!] });
        return json({ error: "فشل إنشاء الطلب لدى مزود الخدمة" }, { status: 502 });
      }
    } catch (error) {
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, session.userId!] });
      throw error;
    }

    let localOrderId: number | null = null;
    try {
      const orderResult = await db.execute({
        sql: "INSERT INTO orders (user_id, smmnine_order_id, service_id, service_name, link, quantity, charge, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [session.userId!, smmnineOrderId, String(service.service), String(service.name), link, qty, cost, "Pending", idempotencyKey || null],
      });
      localOrderId = Number(orderResult.lastInsertRowid);

      await db.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
        args: [session.userId!, "order", -cost, "completed", `طلب #${smmnineOrderId} - ${String(service.name)}`],
      });
    } catch (error) {
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, session.userId!] });
      if (localOrderId) {
        await db.execute({ sql: "UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [localOrderId] }).catch(() => undefined);
      }
      try {
        await cancelOrder(smmnineOrderId);
      } catch {
        console.error("Legacy order rollback failed", { remoteOrderId: smmnineOrderId, userId: session.userId });
      }
      throw error;
    }

    return json({
      order: {
        id: localOrderId,
        smmnine_order_id: smmnineOrderId,
        service_name: service.name,
        charge: cost,
        status: "Pending",
      },
    });
  } catch (err: unknown) {
    console.error("Create order error:", err);
    const message = err instanceof Error ? err.message : "حدث خطأ";
    const status = message === "Unauthorized" ? 401 : message === "Account banned" ? 403 : 500;
    return json({ error: message }, { status });
  }
}
