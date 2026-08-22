import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";
import { cleanPlatformText, parsePlatformServiceIds, platformSlug, publicCatalogPlatform, safePlatformLogo } from "@/lib/catalog-platform";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  action?: string;
  id?: number | string;
  label_ar?: unknown;
  label_en?: unknown;
  description_ar?: unknown;
  description_en?: unknown;
  logo_url?: unknown;
  service_ids?: unknown;
  sort_order?: unknown;
};

function statusFor(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 500;
}

function errorText(error: unknown): string {
  const status = statusFor(error);
  return status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تنفيذ العملية";
}

async function readRows() {
  const result = await db.execute(`
    SELECT id, slug, label_ar, label_en, description_ar, description_en, logo_url,
           service_ids, is_active, sort_order, created_at, updated_at
    FROM catalog_platform_buttons
    ORDER BY sort_order, id
  `);
  return result.rows.map((row) => ({
    ...publicCatalogPlatform(row as Record<string, unknown>),
    id: String((row as Record<string, unknown>).id || ""),
    slug: String((row as Record<string, unknown>).slug || ""),
    created_at: (row as Record<string, unknown>).created_at,
    updated_at: (row as Record<string, unknown>).updated_at,
  }));
}

export async function GET() {
  try {
    await requireAdmin();
    await initDb();
    return NextResponse.json({ platforms: await readRows() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) }, { status: statusFor(error) });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    await initDb();
    const body = await request.json() as Body;
    const action = String(body.action || "save");
    const id = Number(body.id);

    if (["toggle", "delete"].includes(action)) {
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف المنصة غير صالح" }, { status: 400 });
      const result = action === "toggle"
        ? await db.execute({ sql: "UPDATE catalog_platform_buttons SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] })
        : await db.execute({ sql: "DELETE FROM catalog_platform_buttons WHERE id = ?", args: [id] });
      if (result.rowsAffected !== 1) return NextResponse.json({ error: "المنصة غير موجودة" }, { status: 404 });
      return NextResponse.json({ ok: true, platforms: await readRows() });
    }

    const labelAr = cleanPlatformText(body.label_ar, 80);
    const labelEn = cleanPlatformText(body.label_en, 80);
    const descriptionAr = cleanPlatformText(body.description_ar, 160);
    const descriptionEn = cleanPlatformText(body.description_en, 160);
    const logoUrl = safePlatformLogo(body.logo_url);
    const serviceIds = parsePlatformServiceIds(body.service_ids);
    const sortOrder = Math.max(-10000, Math.min(10000, Number(body.sort_order) || 0));

    if (labelAr.length < 2) return NextResponse.json({ error: "اكتب اسم المنصة بالعربية (حرفان على الأقل)" }, { status: 400 });
    if (serviceIds.length === 0) return NextResponse.json({ error: "اختر خدمة واحدة على الأقل لهذا الزر" }, { status: 400 });
    if (body.logo_url && !logoUrl) return NextResponse.json({ error: "رابط الشعار غير صالح؛ استخدم رابط HTTPS أو مسارًا يبدأ بـ /" }, { status: 400 });

    const catalog = await loadServiceCatalog();
    const knownIds = new Set(catalog.map((service) => getPublicServiceId(service)));
    const validIds = serviceIds.filter((serviceId) => knownIds.has(serviceId));
    if (validIds.length !== serviceIds.length) return NextResponse.json({ error: "توجد خدمة غير صالحة أو لم تعد نشطة؛ حدّث قائمة الخدمات وحاول مجددًا" }, { status: 400 });

    const requestedSlug = platformSlug(labelEn || labelAr);
    let slug = requestedSlug;
    if (Number.isInteger(id) && id > 0) {
      slug = `${requestedSlug}-${id}`;
      const result = await db.execute({
        sql: `UPDATE catalog_platform_buttons
              SET slug = ?, label_ar = ?, label_en = ?, description_ar = ?, description_en = ?,
                  logo_url = ?, service_ids = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [slug, labelAr, labelEn || null, descriptionAr || null, descriptionEn || null, logoUrl, JSON.stringify(validIds), sortOrder, id],
      });
      if (result.rowsAffected !== 1) return NextResponse.json({ error: "المنصة غير موجودة" }, { status: 404 });
    } else {
      const existing = await db.execute({ sql: "SELECT id FROM catalog_platform_buttons WHERE slug = ? LIMIT 1", args: [slug] });
      if (existing.rows.length > 0) slug = `${slug}-${Date.now().toString(36)}`;
      await db.execute({
        sql: `INSERT INTO catalog_platform_buttons
              (slug, label_ar, label_en, description_ar, description_en, logo_url, service_ids, sort_order, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [slug, labelAr, labelEn || null, descriptionAr || null, descriptionEn || null, logoUrl, JSON.stringify(validIds), sortOrder, Number(admin.userId || 0)],
      });
    }

    return NextResponse.json({ ok: true, platforms: await readRows() });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) }, { status: statusFor(error) });
  }
}
