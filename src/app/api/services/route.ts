import { NextResponse } from "next/server";
import { getServices } from "@/lib/follower";
import { detectPlatform, detectServiceType } from "@/lib/platform-mapping";
import { db } from "@/lib/db";
import { readServicesCache, writeServicesCache } from "@/lib/services-cache";

type ServiceRecord = Record<string, unknown>;

async function getProviderServices(): Promise<ServiceRecord[]> {
  try {
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
    return rows.rows as ServiceRecord[];
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
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
    const cached = readServicesCache();
    if (cached) return json(cached);

    const [servicesResult, providerServices] = await Promise.all([
      getServices().catch(() => {
        // مزود Follower غير مربوط بمفتاح — نعمل بالخدمات المحلية ومزودين فقط
        return [] as ServiceRecord[];
      }),
      getProviderServices(),
    ]);
    const services = Array.isArray(servicesResult) ? servicesResult : [];

    // دمج خدمات المزودين الخارجيين مع الخدمات المحلية
    const providerMapped = providerServices.map((s: ServiceRecord) => ({
      ...s,
      service: s.local_id != null ? `provider:${String(s.local_id)}` : String(s.service),
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

    const enrichedServices = merged.map((s: ServiceRecord) => ({
      ...s,
      platform: s.platform || detectPlatform(String(s.category || ""), String(s.name || "")),
      serviceType: s.serviceType || detectServiceType(String(s.name || "")),
      name: s.provider_name ? `${String(s.name || "")} [مزود: ${String(s.provider_name)}]` : s.name,
      is_new: Boolean(s.is_new),
    }));

    const categories = [...new Set(merged.map((s: ServiceRecord) => String(s.category || "عام")))].sort();

    const payload = {
      services: enrichedServices,
      categories,
      platforms,
      count: merged.length,
    };
    writeServicesCache(payload);
    return json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل الخدمات";
    return json({ error: message }, { status: 500 });
  }
}
