import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

function serialize(row: any) {
  return {
    ...row,
    id: Number(row.id),
    user_id: Number(row.user_id),
    service_id: Number(row.service_id),
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { service_id, service_name, link, target_quantity, interval_hours } = body;

    if (!service_id || !link || !target_quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO auto_refills (user_id, service_id, service_name, link, target_quantity, interval_hours)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [session.userId!, Number(service_id), service_name || "", link, Number(target_quantity), Number(interval_hours) || 24],
    });

    return NextResponse.json({ refill: result.rows.map(serialize)[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
