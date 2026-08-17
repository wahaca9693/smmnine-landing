import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    // المطابقة: categoryPattern LIKE 'Instagram%' إذا كانت الفئة تبدأ بالنمط، أو مطابقة احتوائية
    let rows: any[] = [];
    if (category) {
      const cur = await db.execute({
        sql: `SELECT * FROM service_requirements WHERE is_active = 1
              AND (category_pattern = ? OR ? LIKE category_pattern OR category_pattern LIKE ?)`,
        args: [category, category, `${category.split(" ")[0]}%`],
      });
      rows = cur.rows as any[];
    }
    // تحويل روابط التطوير https://localhost إلى مسارات نسبية لضمان التحميل
    const fixed = rows.map((r: any) => ({
      ...r,
      image_url: r.image_url ? String(r.image_url).replace(/^https?:\/\/localhost:\d+/, "") : r.image_url,
    }));
    return NextResponse.json({ requirements: fixed });
  } catch (err: any) {
    return NextResponse.json({ requirements: [], error: err.message });
  }
}
