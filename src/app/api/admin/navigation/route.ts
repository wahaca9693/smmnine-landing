import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { navigationAudience, navigationBadgeColor, navigationIcon, validNavigationHref } from "@/lib/navigation";

type NavigationBody = {
  action?: string;
  id?: number | string;
  label_ar?: string;
  label_en?: string;
  href?: string;
  icon?: string;
  badge?: string | null;
  badge_color?: string;
  audience?: string;
  sort_order?: number | string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export async function GET() {
  try {
    await requireAdmin();
    await initDb();
    const result = await db.execute("SELECT id, label_ar, label_en, href, icon, badge, badge_color, audience, is_active, sort_order, created_at, updated_at FROM admin_navigation_items ORDER BY sort_order, id");
    return NextResponse.json({ items: result.rows });
  } catch (error: unknown) {
    const message = errorMessage(error);
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "غير مصرح" : "يرجى تسجيل الدخول" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    await initDb();
    const body = await request.json() as NavigationBody;
    const action = String(body.action || "save");
    const id = Number(body.id);

    if (["toggle", "delete"].includes(action)) {
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "معرّف الزر غير صالح" }, { status: 400 });
      if (action === "toggle") {
        await db.execute({ sql: "UPDATE admin_navigation_items SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
      } else {
        await db.execute({ sql: "DELETE FROM admin_navigation_items WHERE id = ?", args: [id] });
      }
      return NextResponse.json({ ok: true });
    }

    const labelAr = String(body.label_ar || "").trim();
    const labelEn = String(body.label_en || "").trim();
    const href = validNavigationHref(body.href);
    if (labelAr.length < 2 || labelAr.length > 80) return NextResponse.json({ error: "العنوان العربي يجب أن يكون بين حرفين و80 حرفًا" }, { status: 400 });
    if (labelEn.length > 80) return NextResponse.json({ error: "العنوان الإنجليزي طويل جدًا" }, { status: 400 });
    if (!href) return NextResponse.json({ error: "الرابط الداخلي غير صالح؛ استخدم مسارًا يبدأ بـ / فقط" }, { status: 400 });

    const icon = navigationIcon(body.icon);
    const audience = navigationAudience(body.audience);
    const badgeColor = navigationBadgeColor(body.badge_color);
    const badge = body.badge == null ? null : String(body.badge).trim().slice(0, 24) || null;
    const sortOrder = Math.max(-10000, Math.min(10000, Number(body.sort_order) || 0));

    if (Number.isInteger(id) && id > 0) {
      await db.execute({
        sql: `UPDATE admin_navigation_items SET label_ar = ?, label_en = ?, href = ?, icon = ?, badge = ?, badge_color = ?, audience = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [labelAr, labelEn || null, href, icon, badge, badgeColor, audience, sortOrder, id],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO admin_navigation_items (label_ar, label_en, href, icon, badge, badge_color, audience, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [labelAr, labelEn || null, href, icon, badge, badgeColor, audience, sortOrder, Number(admin.userId || 0)],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = errorMessage(error);
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "غير مصرح" : "تعذر حفظ الزر" }, { status });
  }
}
