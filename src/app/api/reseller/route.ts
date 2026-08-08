import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { site_name, contact, notes } = body;

    if (!site_name || !contact) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO reseller_requests (user_id, site_name, contact, notes) VALUES (?, ?, ?, ?) RETURNING *`,
      args: [session.userId!, site_name, contact, notes || ""],
    });

    return NextResponse.json({ request: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
