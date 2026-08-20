import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type ResellerRequestBody = {
  site_name?: unknown;
  contact?: unknown;
  notes?: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body: ResellerRequestBody = await request.json();
    const site_name = stringValue(body.site_name);
    const contact = stringValue(body.contact);
    const notes = stringValue(body.notes);

    if (!site_name || !contact) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO reseller_requests (user_id, site_name, contact, notes) VALUES (?, ?, ?, ?) RETURNING *`,
      args: [session.userId!, site_name, contact, notes],
    });

    return NextResponse.json({ request: result.rows[0] });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
