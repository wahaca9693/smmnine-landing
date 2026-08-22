import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { getServices } from "@/lib/follower";
import {
  buildFallbackDescription,
  isOpaqueServiceText,
  translateServiceDescription,
  translateServiceName,
  translationFingerprint,
} from "@/lib/service-translation";

type JsonRecord = Record<string, unknown>;

type ProviderServiceRow = JsonRecord & {
  id?: unknown;
  remote_service_id?: unknown;
  name?: unknown;
  description?: unknown;
  name_ar?: unknown;
  description_ar?: unknown;
  translation_source_hash?: unknown;
  category?: unknown;
  type?: unknown;
  sell_rate?: unknown;
  rate?: unknown;
  min?: unknown;
  max?: unknown;
  provider_id?: unknown;
};

export type CatalogService = {
  serviceId: string;
  remoteServiceId: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  type: string;
  rate: number;
  min: number;
  max: number;
  source: "follower" | "provider";
  providerId: number | null;
  providerServiceId: number | null;
};

const CATALOG_CACHE_MS = 60_000;
const PROVIDER_CATALOG_TIMEOUT_MS = 45_000;
let catalogCache: { at: number; payload: CatalogService[] } | null = null;
let catalogGeneration = 0;
let catalogInFlight: { generation: number; promise: Promise<CatalogService[]> } | null = null;

export function getPublicServiceId(service: CatalogService): string {
  return getPublicCatalogId(service.source, service.providerId, service.remoteServiceId);
}

export function getPublicProviderServiceId(providerId: number | null, remoteServiceId: string): string {
  return getPublicCatalogId("provider", providerId, remoteServiceId);
}

export function getPublicFollowerServiceId(remoteServiceId: string): string {
  return getPublicCatalogId("follower", null, remoteServiceId);
}

function getPublicCatalogId(source: CatalogService["source"], providerId: number | null, remoteServiceId: string): string {
  const identity = `${source}:${providerId ?? 0}:${remoteServiceId}`;
  return `svc_${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}

export async function findCatalogServiceByPublicId(publicServiceId: string): Promise<CatalogService | null> {
  const normalized = String(publicServiceId ?? "").trim();
  if (!/^svc_[a-f0-9]{20}$/.test(normalized)) return null;
  const catalog = await loadServiceCatalog();
  return catalog.find((service) => getPublicServiceId(service) === normalized) ?? null;
}

export function invalidateServiceCatalogCache(): void {
  catalogCache = null;
  catalogGeneration += 1;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapServiceText(nameValue: unknown, descriptionValue: unknown, categoryValue: unknown, typeValue: unknown, min: number, max: number): {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
} {
  const rawName = String(nameValue ?? "").trim();
  const rawCategory = String(categoryValue ?? "").trim() || "عام";
  const rawType = String(typeValue ?? "").trim() || "service";
  const name = isOpaqueServiceText(rawName)
    ? (rawCategory !== "عام" ? rawCategory : translateServiceName(rawType || "service"))
    : rawName;
  const description = String(descriptionValue ?? "").trim();
  const safeDescription = description || buildFallbackDescription(name, rawCategory, rawType, min, max);
  return {
    name,
    nameAr: translateServiceName(name),
    description: safeDescription,
    descriptionAr: translateServiceDescription(safeDescription),
    category: rawCategory,
  };
}

function mapProviderService(row: ProviderServiceRow): CatalogService | null {
  const localId = numberValue(row.id);
  const remoteId = String(row.remote_service_id ?? "").trim();
  if (!localId || !remoteId) return null;
  const min = numberValue(row.min);
  const max = numberValue(row.max);
  const text = mapServiceText(row.name, row.description, row.category, row.type, min, max);
  const storedNameAr = String(row.name_ar ?? "").trim();
  const storedDescriptionAr = String(row.description_ar ?? "").trim();
  const currentHash = translationFingerprint(text.name, text.description);
  const storedHash = String(row.translation_source_hash ?? "").trim();
  const storedTranslationIsCurrent = storedHash === currentHash;
  return {
    serviceId: `provider:${localId}`,
    remoteServiceId: remoteId,
    ...text,
    nameAr: storedTranslationIsCurrent && storedNameAr ? storedNameAr : text.nameAr,
    descriptionAr: storedTranslationIsCurrent && storedDescriptionAr ? storedDescriptionAr : text.descriptionAr,
    category: text.category,
    type: String(row.type ?? "service"),
    rate: numberValue(row.sell_rate, numberValue(row.rate)),
    min,
    max,
    source: "provider",
    providerId: numberValue(row.provider_id) || null,
    providerServiceId: localId,
  };
}

async function loadProviderCatalog(serviceId?: number): Promise<CatalogService[]> {
  const query = db.execute({
    sql: `SELECT ps.id, ps.remote_service_id, ps.name, ps.description, ps.name_ar, ps.description_ar,
                 ps.translation_source_hash, ps.category, ps.type, ps.sell_rate, ps.rate,
                 ps.min, ps.max, p.id AS provider_id
          FROM provider_services ps
          JOIN providers p ON p.id = ps.provider_id
          WHERE p.is_active = 1 AND ps.is_active = 1${serviceId ? " AND ps.id = ?" : ""}
          ORDER BY p.id, ps.id`,
    args: serviceId ? [serviceId] : [],
  });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), PROVIDER_CATALOG_TIMEOUT_MS));
  const result = await Promise.race([query, timeout]);
  if (!result) return [];
  return (result.rows as unknown as ProviderServiceRow[])
    .map(mapProviderService)
    .filter((service): service is CatalogService => service !== null);
}

export async function loadServiceCatalog(): Promise<CatalogService[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_CACHE_MS) {
    return catalogCache.payload;
  }
  const generation = catalogGeneration;
  if (catalogInFlight?.generation === generation) return catalogInFlight.promise;

  const load = (async (): Promise<CatalogService[]> => {
    const [followerResult, providerResult] = await Promise.all([
      getServices(20_000).catch(() => [] as JsonRecord[]),
      loadProviderCatalog().catch(() => [] as CatalogService[]),
    ]);

    const catalog: CatalogService[] = [];
  for (const item of followerResult) {
    const service = asRecord(item);
    if (!service) continue;
    const id = String(service.service ?? "").trim();
    if (!id) continue;
    catalog.push({
      serviceId: id,
      remoteServiceId: id,
      ...mapServiceText(service.name, service.description, service.category, service.type, numberValue(service.min), numberValue(service.max)),
      type: String(service.type ?? "service"),
      rate: numberValue(service.rate),
      min: numberValue(service.min),
      max: numberValue(service.max),
      source: "follower",
      providerId: null,
      providerServiceId: null,
    });
  }

    const payload = [...catalog, ...providerResult];
    if (catalogGeneration === generation && payload.length > 0) {
      catalogCache = { at: Date.now(), payload };
    }
    return payload;
  })();
  const inFlight = { generation, promise: load };
  catalogInFlight = inFlight;
  try {
    return await load;
  } finally {
    if (catalogInFlight === inFlight) catalogInFlight = null;
  }
}

export async function findCatalogService(serviceId: string): Promise<CatalogService | null> {
  const normalized = String(serviceId ?? "").trim();
  if (!normalized) return null;

  if (normalized.startsWith("provider:")) {
    const localId = Number(normalized.slice("provider:".length));
    if (!Number.isInteger(localId) || localId <= 0) return null;
    const services = await loadProviderCatalog(localId).catch(() => [] as CatalogService[]);
    return services[0] ?? null;
  }

  const catalog = await loadServiceCatalog();
  const exact = catalog.find((service) => service.serviceId === normalized);
  if (exact) return exact;

  const remoteMatches = catalog.filter((service) => service.remoteServiceId === normalized);
  return remoteMatches.length === 1 ? remoteMatches[0] : null;
}
