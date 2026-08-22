import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { findCatalogService, findCatalogServiceByPublicId, getPublicServiceId } from "@/lib/service-catalog";

type AutoRefillRow = Record<string, unknown>;

type AutoRefillBody = {
  service_id?: unknown;
  service_name?: unknown;
  link?: unknown;
  target_quantity?: unknown;
  interval_hours?: unknown;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function serialize(row: AutoRefillRow) {
  return {
    ...row,
    id: Number(row.id),
    user_id: Number(row.user_id),
    service_id: row.public_service_id ? String(row.public_service_id) : String(row.service_id ?? ""),
    public_service_id: row.public_service_id == null ? null : String(row.public_service_id),
    service_name_ar: row.service_name_ar == null ? null : String(row.service_name_ar),
    target_quantity: Number(row.target_quantity),
    interval_hours: Number(row.interval_hours),
    is_active: Number(row.is_active),
  };
}

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT * FROM auto_refills WHERE user_id = ? ORDER BY created_at DESC",
      args: [session.userId!],
    });
    return NextResponse.json({ refills: result.rows.map(serialize) });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const body: AutoRefillBody = await request.json();
    const requestedServiceId = String(body.service_id ?? "").trim();
    const { link, target_quantity, interval_hours } = body;

    if (!requestedServiceId || typeof link !== "string" || !link || !target_quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const catalogService = requestedServiceId.startsWith("svc_")
      ? await findCatalogServiceByPublicId(requestedServiceId)
      : await findCatalogService(requestedServiceId);
    if (!catalogService) {
      return NextResponse.json({ error: "الخدمة غير موجودة أو لم تعد متاحة" }, { status: 400 });
    }

    const publicServiceId = getPublicServiceId(catalogService);
    const result = await db.execute({
      sql: `INSERT INTO auto_refills (user_id, service_id, public_service_id, service_name, service_name_ar, link, target_quantity, interval_hours)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        session.userId!,
        Number(catalogService.remoteServiceId) || 0,
        publicServiceId,
        catalogService.name,
        catalogService.nameAr,
        link,
        Number(target_quantity),
        Number(interval_hours) || 24,
      ],
    });

    return NextResponse.json({ refill: result.rows.map(serialize)[0] });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.execute({
      sql: "DELETE FROM auto_refills WHERE id = ? AND user_id = ?",
      args: [Number(id), session.userId!],
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
