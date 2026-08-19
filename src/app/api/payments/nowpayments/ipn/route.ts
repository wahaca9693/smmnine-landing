import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPLETED_STATUSES = new Set(["finished", "confirmed"]);
const FAILED_STATUSES = new Set(["failed", "expired", "refunded", "wrong_amount"]);

type CryptoDepositRow = {
  id: string | number;
  user_id: string | number;
  status: string;
  amount: string | number;
  payment_id?: string | null;
  order_id?: string | null;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObject((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

function isValidSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const canonical = JSON.stringify(sortObject(parsed));
  const expected = crypto.createHmac("sha512", secret).update(canonical).digest("hex");
  const supplied = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(supplied) || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(supplied, "utf8"));
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.NOWPAYMENTS_IPN_SECRET || process.env.NOWPAYMENTS_IPN_SECRET_KEY || "";
  const signature = request.headers.get("x-nowpayments-sig") || request.headers.get("X-Nowpayments-Sig");

  if (!secret) return json({ error: "IPN غير مهيأ" }, 503);
  if (!isValidSignature(rawBody, signature, secret)) return json({ error: "توقيع IPN غير صالح" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: "بيانات IPN غير صالحة" }, 400);
  }

  const paymentId = String(payload.payment_id || "").trim();
  const status = String(payload.payment_status || "").trim().toLowerCase();
  const orderId = String(payload.order_id || "").trim();
  const priceAmount = numberOrNull(payload.price_amount);
  const actuallyPaid = numberOrNull(payload.actually_paid);
  const payCurrency = String(payload.pay_currency || "").trim().toLowerCase();

  if (!paymentId && !orderId) return json({ error: "معرف الدفع مفقود" }, 400);
  if (!status) return json({ error: "حالة الدفع مفقودة" }, 400);

  await initDb();
  const lookup = paymentId
    ? await db.execute({ sql: "SELECT * FROM crypto_deposits WHERE payment_id = ? LIMIT 1", args: [paymentId] })
    : await db.execute({ sql: "SELECT * FROM crypto_deposits WHERE order_id = ? LIMIT 1", args: [orderId] });
  const deposit = lookup.rows[0] as unknown as CryptoDepositRow | undefined;

  if (!deposit) return json({ received: true, ignored: true });

  await db.execute({
    sql: `UPDATE crypto_deposits
          SET payment_id = COALESCE(payment_id, ?), order_id = COALESCE(order_id, ?),
              payment_status = ?, actually_paid = COALESCE(?, actually_paid),
              pay_currency = COALESCE(?, pay_currency), ipn_received_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [paymentId || null, orderId || null, status, actuallyPaid, payCurrency || null, deposit.id],
  });

  if (deposit.status === "completed") return json({ received: true, already_processed: true });

  if (FAILED_STATUSES.has(status)) {
    await db.execute({ sql: "UPDATE crypto_deposits SET status = ? WHERE id = ? AND status = 'pending'", args: [status, deposit.id] });
    await db.execute({
      sql: "UPDATE transactions SET status = ? WHERE user_id = ? AND type = 'deposit' AND status = 'pending' AND description LIKE ?",
      args: ["failed", deposit.user_id, `%${paymentId}%`],
    });
    return json({ received: true, status });
  }

  if (!COMPLETED_STATUSES.has(status)) return json({ received: true, status, pending: true });

  const creditedAmount = priceAmount ?? Number(deposit.amount);
  if (!Number.isFinite(creditedAmount) || creditedAmount < 1) return json({ error: "قيمة الدفع غير صالحة" }, 400);

  const tx = await db.transaction("write");
  try {
    const claim = await tx.execute({
      sql: "UPDATE crypto_deposits SET status = 'completed', payment_status = ?, actually_paid = COALESCE(?, actually_paid), pay_currency = COALESCE(?, pay_currency), confirmed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'",
      args: [status, actuallyPaid, payCurrency || null, deposit.id],
    });
    if (Number(claim.rowsAffected || 0) !== 1) {
      await tx.commit();
      return json({ received: true, already_processed: true });
    }

    await tx.execute({
      sql: "UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?",
      args: [creditedAmount, deposit.user_id],
    });
    await tx.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'NOWPayments')",
      args: [deposit.user_id, creditedAmount, `شحن كريبتو مؤكد — payment_id: ${paymentId || orderId}`],
    });
    await tx.execute({
      sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
      args: [deposit.user_id, "تم تأكيد الشحن", `تمت إضافة $${creditedAmount.toFixed(6)} إلى محفظتك بعد تأكيد الدفع.`],
    });
    await tx.commit();
  } catch (error) {
    try { await tx.rollback(); } catch {}
    throw error;
  }

  return json({ received: true, credited: creditedAmount });
}

export async function GET() {
  return json({ ok: true, service: "nowpayments-ipn" });
}
