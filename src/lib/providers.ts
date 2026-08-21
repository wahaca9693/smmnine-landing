import { db } from "@/lib/db";

export interface ProviderOrderParams {
  providerId: number;
  service: string;
  link: string;
  quantity: string;
}

export interface ProviderOrderResult {
  ok: boolean;
  remoteOrderId?: string;
  error?: string;
}

function providerEndpointCandidates(input: string): string[] {
  const raw = String(input || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) {
    throw new Error("رابط المزود غير صالح");
  }
  const origin = parsed.origin;
  const directPath = parsed.pathname.replace(/\/+$/, "");
  const basePath = directPath
    .replace(/(?:\/api\/v2(?:\/index\.php)?)$/i, "")
    .replace(/\/+$/, "");
  const direct = `${origin}${directPath || ""}`;
  const standard = `${origin}${basePath}/api/v2`;
  return [...new Set([direct, standard].filter((value) => value && value !== origin))];
}

function providerError(data: unknown, status: number): string {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const message = String(record.error || record.message || "").trim();
  if (status === 401 || /invalid\s*(api\s*)?key|api key/i.test(message)) {
    return "مفتاح API الخاص بالمزود غير صالح أو غير مفعّل";
  }
  if (status === 404) return "لم يُعثر على endpoint المزود";
  return message || `HTTP ${status}`;
}

async function recordProviderHealth(providerId: number, status: "online" | "offline" | "degraded", error: string | null): Promise<void> {
  await db.execute({
    sql: "UPDATE providers SET connection_status = ?, last_error = ?, last_probe_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [status, error ? error.slice(0, 500) : null, providerId],
  }).catch(() => undefined);
}

function isTransportFailure(status: number, message: string): boolean {
  return status >= 500 || status === 0 || /timeout|timed out|fetch failed|network|connect|aborted/i.test(message);
}

/**
 * Sends an order to an active provider that implements the standard SMM
 * Panel API v2 contract. Secrets are kept server-side and never returned.
 */
async function providerAction(providerId: number, params: Record<string, string>): Promise<Record<string, unknown>> {
  const providerResult = await db.execute({
    sql: "SELECT api_url, api_key FROM providers WHERE id = ? AND is_active = 1",
    args: [providerId],
  });
  const provider = providerResult.rows[0] as unknown as { api_url: string; api_key: string } | undefined;
  if (!provider) throw new Error("المزود غير موجود أو معطّل");

  let lastData: unknown = null;
  let lastStatus = 0;
  const endpoints = providerEndpointCandidates(provider.api_url);
  for (const endpoint of endpoints) {
    const body = new URLSearchParams({ key: String(provider.api_key), ...params });
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
    } catch (error: unknown) {
      const message = error instanceof Error && /timeout|aborted/i.test(error.message) ? "انتهت مهلة الاتصال بالمزود" : "تعذر الاتصال بالمزود";
      await recordProviderHealth(providerId, "offline", message);
      throw new Error(message);
    }
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 240) }; }
    lastData = data;
    lastStatus = response.status;
    const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
    if (response.status === 404 && endpoint !== endpoints.at(-1)) continue;
    if (!response.ok || record.error) {
      const message = providerError(data, response.status);
      await recordProviderHealth(providerId, isTransportFailure(response.status, message) ? "offline" : "degraded", message);
      throw new Error(message);
    }
    await recordProviderHealth(providerId, "online", null);
    return record;
  }
  const message = providerError(lastData, lastStatus);
  await recordProviderHealth(providerId, isTransportFailure(lastStatus, message) ? "offline" : "degraded", message);
  throw new Error(message);
}

export async function getProviderOrderStatus(providerId: number, remoteOrderId: string) {
  return providerAction(providerId, { action: "status", order: remoteOrderId });
}

export async function cancelProviderOrder(providerId: number, remoteOrderId: string) {
  return providerAction(providerId, { action: "cancel", order: remoteOrderId });
}

export async function executeProviderOrder(params: ProviderOrderParams): Promise<ProviderOrderResult> {
  const providerResult = await db.execute({
    sql: "SELECT api_url, api_key FROM providers WHERE id = ? AND is_active = 1",
    args: [params.providerId],
  });
  const provider = providerResult.rows[0] as unknown as { api_url: string; api_key: string } | undefined;
  if (!provider) return { ok: false, error: "المزود غير موجود أو معطّل" };

  const body = new URLSearchParams({
    key: String(provider.api_key),
    action: "add",
    service: String(params.service),
    link: String(params.link),
    quantity: String(params.quantity),
  });

  let lastData: unknown = null;
  let lastStatus = 0;
  try {
    const endpoints = providerEndpointCandidates(provider.api_url);
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      const text = await response.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 240) }; }
      lastData = data;
      lastStatus = response.status;
      const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
      if (response.status === 404 && endpoint !== endpoints.at(-1)) continue;
      if (!response.ok || record.error) {
        const message = providerError(data, response.status);
        await recordProviderHealth(params.providerId, isTransportFailure(response.status, message) ? "offline" : "degraded", message);
        return { ok: false, error: message };
      }
      if (record.order === undefined || record.order === null || String(record.order) === "") {
        const message = "استجابة غير صالحة من المزود: لم يُرجع رقم الطلب";
        await recordProviderHealth(params.providerId, "degraded", message);
        return { ok: false, error: message };
      }
      await recordProviderHealth(params.providerId, "online", null);
      return { ok: true, remoteOrderId: String(record.order) };
    }
    const message = providerError(lastData, lastStatus);
    await recordProviderHealth(params.providerId, isTransportFailure(lastStatus, message) ? "offline" : "degraded", message);
    return { ok: false, error: message };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إرسال الطلب للمزود";
    await recordProviderHealth(params.providerId, "offline", message);
    return { ok: false, error: message };
  }
}
