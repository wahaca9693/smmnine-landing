import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers || {}),
    },
  });
}

type DepositMethodRow = Record<string, unknown> & {
  id: number;
  icon?: string;
  min_amount?: number;
  is_active?: number;
};
type DepositBody = { methodId?: unknown; amount?: unknown; notes?: unknown };
type GatewayPaymentResponse = Record<string, unknown>;

let methodsCache: { methods: DepositMethodRow[]; expiresAt: number } | null = null;
let methodsCacheRequest: Promise<DepositMethodRow[]> | null = null;
const METHODS_CACHE_TTL_MS = 30_000;

async function loadActiveMethods(): Promise<DepositMethodRow[]> {
  if (methodsCache && methodsCache.expiresAt > Date.now()) return methodsCache.methods;
  if (methodsCacheRequest) return methodsCacheRequest;

  methodsCacheRequest = (async () => {
    const result = await db.execute("SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id");
    const methods = result.rows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        ...item,
        id: Number(item.id),
        min_amount: ["usdt", "bnb", "btc"].includes(String(item.icon || "").toLowerCase()) ? 1 : Number(item.min_amount),
        is_active: Number(item.is_active),
      } as DepositMethodRow;
    });
    methodsCache = { methods, expiresAt: Date.now() + METHODS_CACHE_TTL_MS };
    return methods;
  })();

  try {
    return await methodsCacheRequest;
  } finally {
    methodsCacheRequest = null;
  }
}

function resolvePayCurrency(config: Record<string, unknown>) {
  const configured = String(config.pay_currency || "").trim().toLowerCase();
  if (configured) return configured;
  const coin = String(config.coin || "").trim().toLowerCase();
  const network = String(config.network || "").trim().toLowerCase();
  if (coin === "btc") return "btc";
  if (coin === "bnb") return "bnbbsc";
  if (coin === "usdt") {
    const suffix: Record<string, string> = { trc20: "trc20", tron: "trc20", bep20: "bsc", bsc: "bsc", erc20: "erc20", ethereum: "erc20", polygon: "matic", xlayer: "xlayer" };
    return `usdt${suffix[network] || network}`;
  }
  return coin;
}

export async function GET() {
  try {
    const methods = await loadActiveMethods();
    return json({ methods }, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل طرق الدفع";
    return json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json() as DepositBody;
    const methodId = typeof body.methodId === "number" || typeof body.methodId === "string" ? body.methodId : null;
    const amount = body.amount;
    const notes = body.notes;
    const numericAmount = Number(amount);

    if (!methodId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return json({ error: "يرجى إدخال طريقة الدفع والمبلغ" }, { status: 400 });
    }

    const methodRes = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ? AND is_active = 1",
      args: [methodId],
    });
    const method = methodRes.rows[0] as unknown as DepositMethodRow | undefined;
    if (!method) return json({ error: "طريقة الدفع غير صالحة" }, { status: 404 });
    const cryptoIcons = new Set(["usdt", "bnb", "btc"]);
    const isCryptoMethod = cryptoIcons.has(String(method.icon || "").toLowerCase());
    const minimumAmount = isCryptoMethod ? 1 : Number(method.min_amount || 0);
    if (minimumAmount > numericAmount) {
      return json({ error: `الحد الأدنى للشحن هو ${minimumAmount.toFixed(2)} دولار` }, { status: 400 });
    }

    let noteText = typeof notes === "string" ? notes.trim() : "";
    let cryptoInfo: { coin: string; network: string; address: string; paymentId?: string; orderId?: string; payAmount?: number; payCurrency?: string } | null = null;
    if (isCryptoMethod) {
      let configured: Record<string, unknown>;
      try {
        configured = JSON.parse(String(method.config || "{}")) as Record<string, unknown>;
      } catch {
        configured = {};
      }

      const coin = String(configured.coin || "").trim().toLowerCase();
      const network = String(configured.network || "").trim().toLowerCase();
      const address = String(configured.address || "").trim();
      if (!coin || !network || !address) {
        return json({ error: "طريقة الدفع غير مكتملة الإعداد من الإدارة" }, { status: 503 });
      }
      cryptoInfo = { coin, network, address };

      if (typeof notes === "string" && notes.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(notes) as Record<string, unknown>;
          if (parsed.type !== "crypto") {
            return json({ error: "بيانات شبكة الدفع غير صالحة" }, { status: 400 });
          }
          const requestedCoin = String(parsed.coin || "").trim().toLowerCase();
          const requestedNetwork = String(parsed.network || "").trim().toLowerCase();
          const requestedAddress = String(parsed.address || "").trim();
          const addressMatches = requestedAddress.toLowerCase() === address.toLowerCase();
          if (requestedCoin !== coin || requestedNetwork !== network || !addressMatches) {
            return json({ error: "اختلاف بين العملة أو الشبكة أو عنوان الإيداع المحدد" }, { status: 400 });
          }
        } catch {
          return json({ error: "بيانات شبكة الدفع غير صالحة" }, { status: 400 });
        }
      }
      noteText = `شحن كريبتو — ${coin.toUpperCase()} عبر ${network}`;

      const nowPaymentsKey = process.env.NOWPAYMENTS_API_KEY;
      if (nowPaymentsKey) {
        const orderId = `crypto-${session.userId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const appUrl = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
        if (!appUrl) return json({ error: "عنوان webhook غير مهيأ من الإدارة" }, { status: 503 });
        const payCurrency = resolvePayCurrency(configured);
        const gatewayResponse = await fetch("https://api.nowpayments.io/v1/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": nowPaymentsKey },
          body: JSON.stringify({
            price_amount: numericAmount,
            price_currency: "usd",
            pay_currency: payCurrency,
            order_id: orderId,
            order_description: `smmnine deposit for user ${session.userId}`,
            ipn_callback_url: `${appUrl}/api/payments/nowpayments/ipn`,
          }),
          cache: "no-store",
        });
        const gatewayData = await gatewayResponse.json().catch(() => ({})) as GatewayPaymentResponse;
        if (!gatewayResponse.ok || !gatewayData.payment_id || !gatewayData.pay_address) {
          console.error("NOWPayments payment creation failed", gatewayResponse.status, gatewayData?.message || "unknown error");
          return json({ error: "تعذر إنشاء عنوان الدفع الآلي حاليًا" }, { status: 502 });
        }
        cryptoInfo = {
          ...cryptoInfo,
          address: String(gatewayData.pay_address),
          paymentId: String(gatewayData.payment_id),
          orderId,
          payAmount: Number(gatewayData.pay_amount || 0) || undefined,
          payCurrency: String(gatewayData.pay_currency || payCurrency),
        };
      }
    }

    const paymentReference = cryptoInfo?.paymentId || cryptoInfo?.orderId;
    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, ?, ?, ?, ?, ?)",
      args: [session.userId!, "deposit", numericAmount, "pending", `طلب شحن رصيد - ${noteText}${paymentReference ? ` - ${paymentReference}` : ""}`, String(method.name_en || method.name || "crypto")],
    });

    if (cryptoInfo) {
      await db.execute({
        sql: `INSERT INTO crypto_deposits (user_id, coin, network, amount, address, status, note, payment_id, order_id, pay_currency)
              VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        args: [session.userId!, cryptoInfo.coin, cryptoInfo.network, numericAmount, cryptoInfo.address, noteText, cryptoInfo.paymentId || null, cryptoInfo.orderId || null, cryptoInfo.payCurrency || null],
      });
    }

    const autoEnabled = Number(method.is_auto || 0) === 1;
    return json({
      message: cryptoInfo
        ? cryptoInfo.paymentId
          ? "تم إنشاء عنوان الدفع. أرسل المبلغ المطلوب، وسيُضاف الرصيد تلقائيًا بعد تأكيد IPN الموقّع."
          : autoEnabled
            ? "تم إنشاء طلب الشحن. سيبقى الرصيد معلقًا حتى تأكيد الدفع عبر بوابة الدفع."
            : "تم تسجيل طلب الشحن. سيبقى الرصيد معلقًا حتى مراجعة الإيداع من الإدارة."
        : "تم إرسال طلب الشحن، وسيتم مراجعته قريبًا.",
      payment: cryptoInfo?.paymentId
        ? { payment_id: cryptoInfo.paymentId, order_id: cryptoInfo.orderId, pay_address: cryptoInfo.address, pay_amount: cryptoInfo.payAmount, pay_currency: cryptoInfo.payCurrency }
        : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Account banned") return json({ error: "الحساب محظور" }, { status: 403 });
    return json({ error: "تعذر معالجة طلب الإيداع حاليًا" }, { status: 500 });
  }
}
