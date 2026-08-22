import { db } from "@/lib/db";
import { findCatalogServiceByPublicId } from "@/lib/service-catalog";
import { getOrderStatus } from "@/lib/follower";
import { getProviderOrderStatus } from "@/lib/providers";
import {
  canRequestOrderCancellation,
  normalizeOrderStatus,
  orderStatusKey,
  orderStatusTranslationKey,
} from "@/lib/order-status";

type OrderRow = {
  id: number;
  user_id: number;
  provider_id?: unknown;
  service_id?: unknown;
  public_service_id?: unknown;
  service_name?: unknown;
  smmnine_order_id?: unknown;
  status?: unknown;
  start_count?: unknown;
  remains?: unknown;
};

type StatusRecord = Record<string, unknown>;

function asRecord(value: unknown): StatusRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as StatusRecord
    : {};
}

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function resolveProviderId(order: OrderRow): Promise<number | null> {
  const directProviderId = numericValue(order.provider_id);
  if (directProviderId && directProviderId > 0) return directProviderId;

  const logResult = await db.execute({
    sql: "SELECT provider_id FROM provider_order_logs WHERE local_order_id = ? AND provider_id IS NOT NULL ORDER BY id DESC LIMIT 1",
    args: [order.id],
  }).catch(() => ({ rows: [] } as { rows: unknown[] }));
  const loggedProviderId = numericValue((logResult.rows[0] as Record<string, unknown> | undefined)?.provider_id);
  if (loggedProviderId && loggedProviderId > 0) return loggedProviderId;

  const publicServiceId = String(order.public_service_id ?? "").trim();
  if (/^svc_[a-f0-9]{20}$/.test(publicServiceId)) {
    const catalogService = await findCatalogServiceByPublicId(publicServiceId).catch(() => null);
    if (catalogService?.source === "provider" && catalogService.providerId) return catalogService.providerId;
  }

  const remoteServiceId = String(order.service_id ?? "").trim();
  if (remoteServiceId) {
    const matches = await db.execute({
      sql: `SELECT DISTINCT p.id AS provider_id
            FROM provider_services ps
            JOIN providers p ON p.id = ps.provider_id
            WHERE ps.remote_service_id = ? AND ps.is_active = 1 AND p.is_active = 1`,
      args: [remoteServiceId],
    }).catch(() => ({ rows: [] } as { rows: unknown[] }));
    const ids = [...new Set(matches.rows.map((row) => numericValue((row as Record<string, unknown>).provider_id)).filter((id): id is number => Boolean(id && id > 0)))];
    if (ids.length === 1) return ids[0];
  }

  return null;
}

export async function refreshOrderStatus(order: OrderRow): Promise<StatusRecord> {
  const remoteOrderId = String(order.smmnine_order_id ?? "").trim();
  if (!remoteOrderId) {
    throw new Error("لم يُسجّل رقم الطلب لدى المزود بعد");
  }

  const providerId = await resolveProviderId(order);
  const hasProviderClue = Boolean(numericValue(order.provider_id) || numericValue(order.service_id) || String(order.public_service_id ?? "").trim());
  if (providerId) {
    const rawStatus = await getProviderOrderStatus(providerId, remoteOrderId);
    const status = asRecord(rawStatus);
    return await persistOrderStatus(order, status, providerId);
  }
  if (hasProviderClue && /^svc_[a-f0-9]{20}$/.test(String(order.public_service_id ?? "").trim())) {
    throw new Error("تعذر ربط الطلب بالمزود الخارجي المسجل؛ راجع إعداد المزود أو اربط الخدمة به من لوحة الإدارة");
  }
  const rawStatus = await getOrderStatus(remoteOrderId);
  const status = asRecord(rawStatus);
  return await persistOrderStatus(order, status, null);
}

async function persistOrderStatus(order: OrderRow, status: StatusRecord, providerId: number | null): Promise<StatusRecord> {
  const normalizedStatus = normalizeOrderStatus(status.status);
  const startCount = numericValue(status.start_count ?? status.startCount);
  const remains = numericValue(status.remains ?? status.remaining);

  await db.execute({
    sql: `UPDATE orders
          SET status = ?,
              provider_id = COALESCE(?, provider_id),
              start_count = COALESCE(?, start_count),
              remains = COALESCE(?, remains),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?`,
    args: [normalizedStatus, providerId, startCount, remains, order.id, order.user_id],
  });

  return {
    ...status,
    status: normalizedStatus,
    status_key: orderStatusKey(normalizedStatus),
    status_i18n_key: orderStatusTranslationKey(normalizedStatus),
    start_count: startCount ?? numericValue(order.start_count),
    remains: remains ?? numericValue(order.remains),
    can_cancel: canRequestOrderCancellation(normalizedStatus),
    cancel_rule: canRequestOrderCancellation(normalizedStatus)
      ? "يمكن طلب الإلغاء، ولا يُعاد الرصيد إلا بعد تأكيد المزود."
      : "لا يمكن إلغاء الطلب بعد بدء التنفيذ أو اكتماله.",
  };
}
