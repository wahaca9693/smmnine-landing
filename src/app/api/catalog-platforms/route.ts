import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { publicCatalogPlatform } from "@/lib/catalog-platform";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await initDb();
    const result = await db.execute(`
      SELECT id, label_ar, label_en, description_ar, description_en, logo_url,
             service_ids, is_active, sort_order
      FROM catalog_platform_buttons
      WHERE is_active = 1
      ORDER BY sort_order, id
    `);
    const platforms = result.rows.map((row) => publicCatalogPlatform(row as Record<string, unknown>));
    return NextResponse.json({ platforms }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ platforms: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
