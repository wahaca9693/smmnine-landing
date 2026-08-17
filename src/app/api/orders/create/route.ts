import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { createOrder, getServices } from "@/lib/follower";
import { executeProviderOrder } from "@/lib/providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const { serviceId, link, quantity } = await request.json();

    if (!serviceId || !link || !quantity) {
      return json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return json({ error: "الكمية يجب أن تكون رقمًا صحيحًا موجبًا" }, { status: 400 });
    }

    // The public catalog contains both Follower services and provider_services.
    // Resolve provider services from the database first so admin changes are authoritative.
    const requestedServiceId = String(serviceId);
    const providerLookupId = requestedServiceId.startsWith("provider:")
      ? requestedServiceId.slice("provider:".length)
      : requestedServiceId;
    const providerResult = await db.execute({
      sql: `SELECT ps.*, p.name AS provider_name
            FROM provider_services ps
            JOIN providers p ON p.id = ps.provider_id
            WHERE p.is_active = 1 AND ps.is_active = 1
              AND (CAST(ps.id AS TEXT) = ? OR ps.remote_service_id = ?)
            LIMIT 1`,
      args: [providerLookupId, requestedServiceId],
    });
    const providerService = providerResult.rows[0] as any;

    if (providerService) {
      const min = Number(providerService.min) || 0;
      const max = Number(providerService.max) || Number.MAX_SAFE_INTEGER;
      if (qty < min || qty > max) {
        return json({ error: `الكمية يجب أن تكون بين ${min} و ${max}` }, { status: 400 });
      }

      const sellRate = providerService.sell_rate != null
        ? Number(providerService.sell_rate)
        : Number(providerService.rate) * (1 + (Number(providerService.markup_percent) || 30) / 100);
      const cost = (sellRate * qty) / 1000;
      if (!Number.isFinite(cost) || cost < 0) {
        return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });
      }

      const userResult = await db.execute({
        sql: "SELECT balance FROM users WHERE id = ?",
        args: [session.userId!],
      });
      const balance = Number((userResult.rows[0] as any)?.balance || 0);
      if (balance < cost) {
        return json({ error: "رصيد غير كافٍ" }, { status: 400 });
      }

      // Reserve the user's wallet before contacting the provider. The conditional
      // update prevents a concurrent request from spending the same balance twice.
      const debit = await db.execute({
        sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
        args: [cost, session.userId!, cost],
      });
      if (Number((debit as any).rowsAffected || 0) !== 1) {
        return json({ error: "رصيد غير كافٍ أو تغيّر أثناء المعالجة" }, { status: 409 });
      }

      let localOrderId: number | null = null;
      try {
        const orderResult = await db.execute({
          sql: `INSERT INTO orders (user_id, service_id, service_name, link, quantity, charge, status)
                VALUES (?, ?, ?, ?, ?, ?, 'processing')`,
          args: [session.userId!, Number(providerService.id), String(providerService.name), String(link), qty, cost],
        });
        localOrderId = Number((orderResult as any).lastInsertRowid);

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

    // Follower-backed services retain the existing remote order flow.
    let services: any[] = [];
    try {
      services = await getServices();
    } catch {
      services = [];
    }
    const service = services.find((s: any) => String(s.service) === String(serviceId));
    if (!service) {
      return json({ error: "الخدمة غير موجودة أو غير نشطة" }, { status: 404 });
    }

    if (qty < Number(service.min) || qty > Number(service.max)) {
      return json({ error: `الكمية يجب أن تكون بين ${service.min} و ${service.max}` }, { status: 400 });
    }

    const cost = (Number(service.rate) * qty) / 1000;
    if (!Number.isFinite(cost) || cost < 0) {
      return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });
    }

    const userResult = await db.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [session.userId!] });
    const balance = Number((userResult.rows[0] as any)?.balance || 0);
    if (balance < cost) {
      return json({ error: "رصيد غير كافٍ" }, { status: 400 });
    }

    const smmnineResult = await createOrder(String(serviceId), String(link), String(qty));
    if (!smmnineResult.order) {
      return json({ error: "فشل إنشاء الطلب في Follower" }, { status: 502 });
    }

    await db.execute({
      sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
      args: [cost, session.userId!, cost],
    });

    const orderResult = await db.execute({
      sql: "INSERT INTO orders (user_id, smmnine_order_id, service_id, service_name, link, quantity, charge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [session.userId!, smmnineResult.order, Number(serviceId), service.name, link, qty, cost, "Pending"],
    });

    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
      args: [session.userId!, "order", -cost, "completed", `طلب #${smmnineResult.order} - ${service.name}`],
    });

    return json({
      order: {
        id: Number(orderResult.lastInsertRowid),
        smmnine_order_id: smmnineResult.order,
        service_name: service.name,
        charge: cost,
        status: "Pending",
      },
    });
  } catch (err: any) {
    console.error("Create order error:", err);
    const status = err?.message === "Unauthorized" ? 401 : err?.message === "Account banned" ? 403 : 500;
    return json({ error: err.message || "حدث خطأ" }, { status });
  }
}
