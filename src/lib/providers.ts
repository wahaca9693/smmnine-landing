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
    if (!response.ok || record.error) throw new Error(providerError(data, response.status));
    return record;
  }
  throw new Error(providerError(lastData, lastStatus));
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
      if (!response.ok || record.error) return { ok: false, error: providerError(data, response.status) };
      if (record.order === undefined || record.order === null || String(record.order) === "") {
        return { ok: false, error: "استجابة غير صالحة من المزود: لم يُرجع رقم الطلب" };
      }
      return { ok: true, remoteOrderId: String(record.order) };
    }
    return { ok: false, error: providerError(lastData, lastStatus) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "تعذر إرسال الطلب للمزود" };
  }
}
