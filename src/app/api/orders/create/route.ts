import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrder, getServices } from "@/lib/follower";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { serviceId, link, quantity } = await request.json();

    if (!serviceId || !link || !quantity) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const services = await getServices();
    const service = services.find((s: any) => String(s.service) === String(serviceId));

    if (!service) {
      return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
    }

    const qty = Number(quantity);
    if (qty < service.min || qty > service.max) {
      return NextResponse.json(
        { error: `الكمية يجب أن تكون بين ${service.min} و ${service.max}` },
        { status: 400 }
      );
    }

    const cost = (Number(service.rate) * qty) / 1000;

    const userResult = await db.execute({
      sql: "SELECT balance FROM users WHERE id = ?",
      args: [session.userId!],
    });

    const balance = Number(userResult.rows[0]?.balance || 0);
    if (balance < cost) {
      return NextResponse.json({ error: "رصيد غير كافٍ" }, { status: 400 });
    }

    // Create order in Follower
    const smmnineResult = await createOrder(String(serviceId), link, String(quantity));

    if (!smmnineResult.order) {
      return NextResponse.json({ error: "فشل إنشاء الطلب في Follower" }, { status: 500 });
    }

    // Deduct balance
    await db.execute({
      sql: "UPDATE users SET balance = balance - ? WHERE id = ?",
      args: [cost, session.userId!],
    });

    // Save order
    const orderResult = await db.execute({
      sql: "INSERT INTO orders (user_id, smmnine_order_id, service_id, service_name, link, quantity, charge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        session.userId!,
        smmnineResult.order,
        serviceId,
        service.name,
        link,
        qty,
        cost,
        "Pending",
      ],
    });

    // Record transaction
    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
      args: [session.userId!, "order", -cost, "completed", `طلب #${smmnineResult.order} - ${service.name}`],
    });

    return NextResponse.json({
      order: {
        id: Number(orderResult.lastInsertRowid),
        smmnine_order_id: smmnineResult.order,
        service_name: service.name,
        charge: cost,
      },
    });
  } catch (err: any) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ" }, { status: 500 });
  }
}
