const API_URL = process.env.SMMNINE_API_URL || "https://smmnine.com/api/v2";
const API_KEY = process.env.SMMNINE_API_KEY;
const REQUEST_TIMEOUT_MS = 8000;

export async function smmnineRequest(params: Record<string, string>) {
  if (!API_KEY) throw new Error("مزود الخدمات الخارجي غير مهيأ بعد");

  const body = new URLSearchParams({ key: API_KEY, ...params });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("استجابة غير صالحة من مزود الخدمات");
    }

    if (!res.ok || data.error) {
      throw new Error(data.error || `مزود الخدمات أعاد HTTP ${res.status}`);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("استغرق مزود الخدمات وقتًا طويلًا للاستجابة");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServices() {
  const data = await smmnineRequest({ action: "services" });
  return Array.isArray(data) ? data : [];
}

export async function getBalance() {
  return smmnineRequest({ action: "balance" });
}

export async function createOrder(service: string, link: string, quantity: string) {
  return smmnineRequest({ action: "add", service, link, quantity });
}

export async function getOrderStatus(orderId: string) {
  return smmnineRequest({ action: "status", order: orderId });
}

export async function refillOrder(orderId: string) {
  return smmnineRequest({ action: "refill", order: orderId });
}

export async function cancelOrder(orderId: string) {
  return smmnineRequest({ action: "cancel", order: orderId });
}
