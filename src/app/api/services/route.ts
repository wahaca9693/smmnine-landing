import { NextResponse } from "next/server";
import { getServices } from "@/lib/follower";
import { detectPlatform, detectServiceType } from "@/lib/platform-mapping";
import { db, initDb } from "@/lib/db";

async function getProviderServices(): Promise<any[]> {
  try {
    await initDb();
    const rows = await db.execute({
      sql: `SELECT ps.remote_service_id AS service, ps.name, ps.type, ps.sell_rate AS rate, ps.min, ps.max,
                   CASE WHEN ps.category <> '' THEN ps.category ELSE COALESCE(p.notes, 'عام') END AS category, 0 AS refill,
                   p.id AS provider_id, p.name AS provider_name, ps.is_new AS is_new, ps.id AS local_id
            FROM provider_services ps
            JOIN providers p ON p.id = ps.provider_id
            WHERE p.is_active = 1 AND ps.is_active = 1
            ORDER BY p.id, ps.remote_service_id`,
      args: [],
    });
    return rows.rows as any[];
  } catch {
    return [];
  }
}

const platforms = [
  { id: "facebook", name: "فيسبوك", color: "#1877F2" },
  { id: "tiktok", name: "تيك توك", color: "#000000" },
  { id: "instagram", name: "إنستغرام", color: "#E4405F" },
  { id: "whatsapp", name: "واتساب", color: "#25D366" },
  { id: "twitter", name: "تويتر / X", color: "#1DA1F2" },
  { id: "youtube", name: "يوتيوب", color: "#FF0000" },
  { id: "telegram", name: "تيليجرام", color: "#229ED9" },
  { id: "discord", name: "ديسكورد", color: "#5865F2" },
  { id: "snapchat", name: "سناب جات", color: "#FFFC00" },
  { id: "threads", name: "ثريدز", color: "#000000" },
  { id: "twitch", name: "تويتش", color: "#9146FF" },
  { id: "kuaishou", name: "كواي", color: "#FF6600" },
  { id: "likee", name: "كيك", color: "#FF0050" },
  { id: "spotify", name: "سبوتيفاي", color: "#1DB954" },
  { id: "other", name: "أخرى", color: "#6B7280" },
  { id: "all", name: "الكل", color: "var(--color-primary)" },
];

export async function GET() {
  try {
    let services: any[] = [];
    try {
      services = await getServices();
    } catch {
      // مزود Follower غير مربوط بمفتاح — نعمل بالخدمات المحلية ومزودين فقط
      services = [];
    }
    const providerServices = await getProviderServices();

    // دمج خدمات المزودين الخارجيين مع الخدمات المحلية
    const providerMapped = providerServices.map((s: any) => ({
      ...s,
      service: String(s.service),
      remote_service_id: String(s.service),
      rate: String(s.rate),
      min: String(s.min),
      max: String(s.max),
      refill: false,
      source: "provider",
      provider_id: s.provider_id,
      provider_name: s.provider_name,
      is_new: Number(s.is_new) === 1,
    }));
    const merged = [...services, ...providerMapped];

    const enrichedServices = merged.map((s: any) => ({
      ...s,
      platform: s.platform || detectPlatform(s.category || "", s.name || ""),
      serviceType: s.serviceType || detectServiceType(s.name || ""),
      name: s.provider_name ? `${s.name} [مزود: ${s.provider_name}]` : s.name,
      is_new: !!s.is_new,
    }));

    const categories = [...new Set(merged.map((s: any) => s.category || "عام"))].sort();

    return NextResponse.json({
      services: enrichedServices,
      categories,
      platforms,
      count: merged.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
