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

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id");
    const methods = result.rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      min_amount: Number(row.min_amount),
      is_active: Number(row.is_active),
    }));
    return json({ methods });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { methodId, amount, notes } = await request.json();
    const numericAmount = Number(amount);

    if (!methodId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return json({ error: "يرجى إدخال طريقة الدفع والمبلغ" }, { status: 400 });
    }

    const methodRes = await db.execute({
      sql: "SELECT * FROM payment_methods WHERE id = ? AND is_active = 1",
      args: [methodId],
    });
    const method = methodRes.rows[0] as any;
    if (!method) return json({ error: "طريقة الدفع غير صالحة" }, { status: 404 });
    if (Number(method.min_amount || 0) > numericAmount) {
      return json({ error: `الحد الأدنى للشحن هو ${Number(method.min_amount).toFixed(2)}` }, { status: 400 });
    }

    let noteText = typeof notes === "string" ? notes.trim() : "";
    let cryptoInfo: { coin: string; network: string; address: string } | null = null;
    const cryptoIcons = new Set(["usdt", "bnb", "btc"]);

    if (cryptoIcons.has(String(method.icon || "").toLowerCase())) {
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
    }

    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, ?, ?, ?, ?, ?)",
      args: [session.userId!, "deposit", numericAmount, "pending", `طلب شحن رصيد - ${noteText}`, String(method.name_en || method.name || "crypto")],
    });

    if (cryptoInfo) {
      await db.execute({
        sql: `INSERT INTO crypto_deposits (user_id, coin, network, amount, address, status, note)
              VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        args: [session.userId!, cryptoInfo.coin, cryptoInfo.network, numericAmount, cryptoInfo.address, noteText],
      });
    }

    const autoEnabled = Number(method.is_auto || 0) === 1;
    return json({
      message: cryptoInfo
        ? autoEnabled
          ? "تم إنشاء طلب الشحن. سيبقى الرصيد معلقًا حتى تأكيد الدفع عبر بوابة الدفع."
          : "تم تسجيل طلب الشحن. سيبقى الرصيد معلقًا حتى مراجعة الإيداع من الإدارة."
        : "تم إرسال طلب الشحن، وسيتم مراجعته قريبًا.",
    });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
