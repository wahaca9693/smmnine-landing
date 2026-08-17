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

/**
 * Sends an order to an active provider that implements the standard SMM
 * Panel API v2 contract. Secrets are kept server-side and never returned.
 */
export async function executeProviderOrder(params: ProviderOrderParams): Promise<ProviderOrderResult> {
  const providerResult = await db.execute({
    sql: "SELECT api_url, api_key FROM providers WHERE id = ? AND is_active = 1",
    args: [params.providerId],
  });
  const provider = providerResult.rows[0] as unknown as { api_url: string; api_key: string } | undefined;
  if (!provider) return { ok: false, error: "المزود غير موجود أو معطّل" };

  const url = String(provider.api_url).replace(/\/+$/, "");
  const body = new URLSearchParams({
    key: String(provider.api_key),
    action: "add",
    service: String(params.service),
    link: String(params.link),
    quantity: String(params.quantity),
  });

  try {
    const response = await fetch(url + "/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || data.error) {
      return { ok: false, error: String(data.error || `HTTP ${response.status}`) };
    }
    if (data.order === undefined || data.order === null || String(data.order) === "") {
      return { ok: false, error: "استجابة غير صالحة من المزود: لم يُرجع رقم الطلب" };
    }
    return { ok: true, remoteOrderId: String(data.order) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "تعذر إرسال الطلب للمزود" };
  }
}
