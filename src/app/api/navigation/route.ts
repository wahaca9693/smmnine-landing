import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await initDb();
    const result = await db.execute(`
      SELECT id, label_ar, label_en, description_ar, description_en, href, icon, badge, badge_color, audience, sort_order
      FROM admin_navigation_items
      WHERE is_active = 1 AND audience IN ('user', 'both')
      ORDER BY sort_order, id
    `);
    return NextResponse.json({ items: result.rows }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
