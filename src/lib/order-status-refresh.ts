import { db } from "@/lib/db";
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

export async function refreshOrderStatus(order: OrderRow): Promise<StatusRecord> {
  const remoteOrderId = String(order.smmnine_order_id ?? "").trim();
  if (!remoteOrderId) {
    throw new Error("لم يُسجّل رقم الطلب لدى المزود بعد");
  }

  const providerId = numericValue(order.provider_id);
  const rawStatus = providerId
    ? await getProviderOrderStatus(providerId, remoteOrderId)
    : await getOrderStatus(remoteOrderId);
  const status = asRecord(rawStatus);
  const normalizedStatus = normalizeOrderStatus(status.status);
  const startCount = numericValue(status.start_count ?? status.startCount);
  const remains = numericValue(status.remains ?? status.remaining);

  await db.execute({
    sql: `UPDATE orders
          SET status = ?,
              start_count = COALESCE(?, start_count),
              remains = COALESCE(?, remains),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?`,
    args: [normalizedStatus, startCount, remains, order.id, order.user_id],
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
