import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RequirementRow = Record<string, unknown>;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    // المطابقة: categoryPattern LIKE 'Instagram%' إذا كانت الفئة تبدأ بالنمط، أو مطابقة احتوائية
    let rows: RequirementRow[] = [];
    if (category) {
      const cur = await db.execute({
        sql: `SELECT * FROM service_requirements WHERE is_active = 1
              AND (category_pattern = ? OR ? LIKE category_pattern OR category_pattern LIKE ?)`,
        args: [category, category, `${category.split(" ")[0]}%`],
      });
      rows = cur.rows as RequirementRow[];
    }
    // تحويل روابط التطوير https://localhost إلى مسارات نسبية لضمان التحميل
    const fixed = rows.map((row) => ({
      ...row,
      image_url: row.image_url ? String(row.image_url).replace(/^https?:\/\/localhost:\d+/, "") : row.image_url,
    }));
    return NextResponse.json({ requirements: fixed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل متطلبات الخدمة";
    return NextResponse.json({ requirements: [], error: message });
  }
}
