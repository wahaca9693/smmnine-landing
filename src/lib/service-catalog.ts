import { db } from "@/lib/db";
import { getServices } from "@/lib/follower";

type JsonRecord = Record<string, unknown>;

export type CatalogService = {
  serviceId: string;
  remoteServiceId: string;
  name: string;
  category: string;
  type: string;
  rate: number;
  min: number;
  max: number;
  source: "follower" | "provider";
  providerId: number | null;
  providerServiceId: number | null;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function loadServiceCatalog(): Promise<CatalogService[]> {
  const catalog: CatalogService[] = [];

  try {
    const followerServices = await getServices();
    if (Array.isArray(followerServices)) {
      for (const item of followerServices) {
        const service = asRecord(item);
        if (!service) continue;
        const id = String(service.service ?? "").trim();
        if (!id) continue;
        catalog.push({
          serviceId: id,
          remoteServiceId: id,
          name: String(service.name ?? `الخدمة #${id}`),
          category: String(service.category ?? "عام"),
          type: String(service.type ?? "service"),
          rate: numberValue(service.rate),
          min: numberValue(service.min),
          max: numberValue(service.max),
          source: "follower",
          providerId: null,
          providerServiceId: null,
        });
      }
    }
  } catch {
    // الخدمات المحلية قد لا تكون متاحة إذا لم يُضبط مزود Follower.
  }

  try {
    const result = await db.execute({
      sql: `SELECT ps.id, ps.remote_service_id, ps.name, ps.category, ps.type, ps.sell_rate, ps.rate,
                   ps.min, ps.max, p.id AS provider_id
            FROM provider_services ps
            JOIN providers p ON p.id = ps.provider_id
            WHERE p.is_active = 1 AND ps.is_active = 1
            ORDER BY p.id, ps.id`,
      args: [],
    });
    for (const row of result.rows as unknown as JsonRecord[]) {
      const localId = numberValue(row.id);
      if (!localId) continue;
      const remoteId = String(row.remote_service_id ?? "").trim();
      if (!remoteId) continue;
      catalog.push({
        serviceId: `provider:${localId}`,
        remoteServiceId: remoteId,
        name: String(row.name ?? `الخدمة #${remoteId}`),
        category: String(row.category ?? "عام"),
        type: String(row.type ?? "service"),
        rate: numberValue(row.sell_rate, numberValue(row.rate)),
        min: numberValue(row.min),
        max: numberValue(row.max),
        source: "provider",
        providerId: numberValue(row.provider_id) || null,
        providerServiceId: localId,
      });
    }
  } catch {
    // نعيد الخدمات المحلية حتى لو تعذر استعلام مزودي الخدمات مؤقتًا.
  }

  return catalog;
}

export async function findCatalogService(serviceId: string): Promise<CatalogService | null> {
  const normalized = String(serviceId ?? "").trim();
  if (!normalized) return null;
  const catalog = await loadServiceCatalog();
  return catalog.find((service) => service.serviceId === normalized || service.remoteServiceId === normalized) ?? null;
}
