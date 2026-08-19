export type OrderStatusKey =
  | "pending"
  | "reviewing"
  | "processing"
  | "in_progress"
  | "partial"
  | "completed"
  | "canceled"
  | "failed"
  | "refunded"
  | "stopped"
  | "paused"
  | "unknown";

export function normalizeOrderStatus(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (lower === "in progress" || lower === "inprogress" || lower === "running") return "In progress";
  if (lower === "pending" || lower === "queued" || lower === "waiting") return "Pending";
  if (lower === "processing" || lower === "working") return "Processing";
  if (lower === "reviewing" || lower === "under review") return "Reviewing";
  if (lower === "partial" || lower === "partially completed") return "Partial";
  if (lower === "completed" || lower === "complete" || lower === "done" || lower === "success") return "Completed";
  if (lower === "canceled" || lower === "cancelled" || lower === "cancel") return "Canceled";
  if (lower === "failed" || lower === "fail" || lower === "error") return "Failed";
  if (lower === "refunded" || lower === "refund") return "Refunded";
  if (lower === "stopped" || lower === "stop") return "Stopped";
  if (lower === "paused" || lower === "pause") return "Paused";
  return raw;
}

export function orderStatusKey(value: unknown): OrderStatusKey {
  const status = normalizeOrderStatus(value).toLowerCase();
  if (status === "pending") return "pending";
  if (status === "reviewing") return "reviewing";
  if (status === "processing") return "processing";
  if (status === "in progress") return "in_progress";
  if (status === "partial") return "partial";
  if (status === "completed") return "completed";
  if (status === "canceled") return "canceled";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";
  if (status === "stopped") return "stopped";
  if (status === "paused") return "paused";
  return "unknown";
}

export function orderStatusTranslationKey(value: unknown): string {
  const key = orderStatusKey(value);
  return `order.${key}`;
}

/**
 * The provider must confirm cancellation before the wallet is refunded.
 * Only queued/pending/reviewing/stopped/paused orders are eligible.
 */
export function canRequestOrderCancellation(value: unknown): boolean {
  return ["pending", "reviewing", "stopped", "paused"].includes(orderStatusKey(value));
}

export function isFinalOrderStatus(value: unknown): boolean {
  return ["completed", "partial", "canceled", "failed", "refunded", "in_progress", "processing"].includes(orderStatusKey(value));
}
