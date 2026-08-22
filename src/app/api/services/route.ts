import { NextResponse } from "next/server";
import { defaultPlatformOptions, detectPlatform, detectServiceType, normalizePlatformId, platformOption } from "@/lib/platform-mapping";
import { db } from "@/lib/db";
import { readServicesCache, writeServicesCache } from "@/lib/services-cache";
import { getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";
import { translateCategory } from "@/lib/service-translation";
import { publicCatalogPlatform, type CatalogPlatform } from "@/lib/catalog-platform";

type ServiceRecord = Record<string, unknown>;
type ServicesPayload = {
  services: ServiceRecord[];
  categories: string[];
  platforms: ReturnType<typeof buildPlatformOptions>;
  count: number;
};

const CATALOG_READ_TIMEOUT_MS = 30_000;
let servicesLoadInFlight: Promise<ServicesPayload> | null = null;

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
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

function buildPlatformOptions(customPlatforms: CatalogPlatform[]) {
  const legacyPlatforms = defaultPlatformOptions.filter((platform) => platform.id !== "all");
  const customIds = new Set(customPlatforms.map((platform) => platform.id));
  return [
    { ...platformOption("all"), color: "var(--color-primary)" },
    ...legacyPlatforms.filter((platform) => !customIds.has(platform.id)),
    ...customPlatforms.map((platform) => ({
      id: platform.id,
      name: platform.label_ar,
      nameAr: platform.label_ar,
      nameEn: platform.label_en,
      descriptionAr: platform.description_ar,
      descriptionEn: platform.description_en,
      logoUrl: platform.logo_url,
      serviceIds: platform.service_ids,
      color: "var(--color-primary)",
      count: platform.service_ids.length,
    })),
  ];
}

async function getCustomPlatforms(): Promise<CatalogPlatform[]> {
  const result = await db.execute(`
    SELECT id, label_ar, label_en, description_ar, description_en, logo_url,
           service_ids, is_active, sort_order
    FROM catalog_platform_buttons
    WHERE is_active = 1
    ORDER BY sort_order, id
  `);
  return result.rows.map((row) => publicCatalogPlatform(row as Record<string, unknown>));
}

async function buildServicesPayload(): Promise<ServicesPayload> {
  const [catalog, customPlatforms] = await Promise.all([
    withTimeout(loadServiceCatalog(), [], CATALOG_READ_TIMEOUT_MS),
    getCustomPlatforms().catch(() => [] as CatalogPlatform[]),
  ]);
  const merged: ServiceRecord[] = catalog.map((service) => ({
    service: getPublicServiceId(service),
    remote_service_id: service.remoteServiceId,
    name: service.name,
    nameAr: service.nameAr,
    description: service.description,
    descriptionAr: service.descriptionAr,
    category: service.category || "عام",
    categoryAr: translateCategory(service.category || "عام"),
    type: service.type,
    rate: String(service.rate),
    min: String(service.min),
    max: String(service.max),
    refill: false,
    is_new: false,
  }));

  const enrichedServices = merged.map((s: ServiceRecord) => ({
    ...s,
    platform: normalizePlatformId(String(s.platform || detectPlatform(String(s.category || ""), String(s.name || "")))),
    serviceType: s.serviceType || detectServiceType(String(s.name || "")),
    name: String(s.name || "الخدمة"),
    nameAr: String(s.nameAr || s.name || "الخدمة"),
    description: String(s.description || ""),
    descriptionAr: String(s.descriptionAr || s.description || ""),
    categoryAr: String(s.categoryAr || s.category || "عام"),
    is_new: Boolean(s.is_new),
  }));

  if (merged.length === 0) {
    throw new Error("تعذر قراءة كتالوج الخدمات من قاعدة البيانات حاليًا");
  }

  const categories = [...new Set(merged.map((s: ServiceRecord) => String(s.category || "عام")))].sort();
  const payload: ServicesPayload = {
    services: enrichedServices,
    categories,
    platforms: buildPlatformOptions(customPlatforms),
    count: merged.length,
  };
  // لا نحول تعثر المزود إلى كاش فارغ لمدة دقيقة كاملة.
  if (merged.length > 0) writeServicesCache(payload);
  return payload;
}

async function refreshServicesPayload(): Promise<ServicesPayload> {
  const load = servicesLoadInFlight ?? buildServicesPayload();
  servicesLoadInFlight = load;
  try {
    return await load;
  } finally {
    if (servicesLoadInFlight === load) servicesLoadInFlight = null;
  }
}

export async function GET() {
  const cached = readServicesCache();
  if (cached) return json(cached);

  // عند انتهاء الكاش، اعرض آخر كتالوج غير فارغ فورًا وحدثه دون حجب الواجهة.
  const stale = readServicesCache({ allowStale: true });
  if (stale) {
    void refreshServicesPayload().catch(() => undefined);
    return json(stale, { headers: { "X-Services-Cache": "stale" } });
  }

  try {
    return json(await refreshServicesPayload());
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل الخدمات";
    return json({ error: message }, { status: 500 });
  }
}
