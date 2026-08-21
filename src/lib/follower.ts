const API_URL = process.env.SMMNINE_API_URL || "https://smmnine.com/api/v2";
const API_KEY = process.env.SMMNINE_API_KEY;
const REQUEST_TIMEOUT_MS = 8000;

type JsonRecord = Record<string, unknown>;
type JsonPayload = JsonRecord | JsonRecord[];

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isJsonPayload(value: unknown): value is JsonPayload {
  return Array.isArray(value) ? value.every(isJsonRecord) : isJsonRecord(value);
}

async function requestPayload(params: Record<string, string>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<JsonPayload> {
  if (!API_KEY) throw new Error("مزود الخدمات الخارجي غير مهيأ بعد");
  const body = new URLSearchParams({ key: API_KEY, ...params });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("استجابة غير صالحة من مزود الخدمات");
    }
    if (!isJsonPayload(parsed)) {
      throw new Error("استجابة غير صالحة من مزود الخدمات");
    }

    const record = isJsonRecord(parsed) ? parsed : null;
    const providerError = record?.error;
    if (!res.ok || providerError) {
      throw new Error(String(providerError || `مزود الخدمات أعاد HTTP ${res.status}`));
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("استغرق مزود الخدمات وقتًا طويلًا للاستجابة");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function smmnineRequest(params: Record<string, string>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<JsonRecord> {
  const data = await requestPayload(params, timeoutMs);
  if (!isJsonRecord(data)) throw new Error("استجابة غير صالحة من مزود الخدمات");
  return data;
}

export async function getServices(timeoutMs = REQUEST_TIMEOUT_MS): Promise<JsonRecord[]> {
  const data = await requestPayload({ action: "services" }, timeoutMs);
  return Array.isArray(data) ? data : [];
}

export async function getBalance(): Promise<JsonRecord> {
  return smmnineRequest({ action: "balance" });
}

export async function createOrder(service: string, link: string, quantity: string): Promise<JsonRecord> {
  return smmnineRequest({ action: "add", service, link, quantity });
}

export async function getOrderStatus(orderId: string): Promise<JsonRecord> {
  return smmnineRequest({ action: "status", order: orderId });
}

export async function refillOrder(orderId: string): Promise<JsonRecord> {
  return smmnineRequest({ action: "refill", order: orderId });
}

export async function cancelOrder(orderId: string): Promise<JsonRecord> {
  return smmnineRequest({ action: "cancel", order: orderId });
}
