const API_URL = process.env.SMMNINE_API_URL || "https://smmnine.com/api/v2";
const API_KEY = process.env.SMMNINE_API_KEY;

export async function smmnineRequest(params: Record<string, string>) {
  if (!API_KEY) throw new Error("SMMNINE_API_KEY not set");

  const body = new URLSearchParams({ key: API_KEY, ...params });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "SmmNine API error");
  }
  return data;
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
