import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id");
    const methods = result.rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      min_amount: Number(row.min_amount),
      is_active: Number(row.is_active),
    }));
    return NextResponse.json({ methods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { methodId, amount, notes } = await request.json();

    if (!methodId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "يرجى إدخال طريقة الدفع والمبلغ" }, { status: 400 });
    }

    // تحقق من طريقة الدفع
    const methodRes = await db.execute({ sql: "SELECT * FROM payment_methods WHERE id = ? AND is_active = 1", args: [methodId] });
    const method = methodRes.rows[0] as any;
    if (!method) return NextResponse.json({ error: "طريقة الدفع غير صالحة" }, { status: 404 });

    let noteText = notes || "";
    let cryptoInfo: { coin: string; network: string; address: string } | null = null;

    // شحن كريبتو: نحاول تحليل notes كـ JSON يحتوي بيانات العملة
    if (typeof notes === "string" && notes.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(notes);
        if (parsed?.type === "crypto" && parsed?.coin && parsed?.address) {
          cryptoInfo = { coin: parsed.coin, network: parsed.network, address: parsed.address };
          noteText = `شحن كريبتو — ${parsed.coin} عبر ${parsed.network || "الشبكة"}`;
        }
      } catch {
        /* لا شيء — notes نص عادي */
      }
    }

    await db.execute({
      sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
      args: [session.userId!, "deposit", amount, "pending", `طلب شحن رصيد - ${noteText}`],
    });

    // تسجيل طلب الكريبتو في جدول crypto_deposits للتتبع التلقائي
    if (cryptoInfo) {
      await db.execute({
        sql: `INSERT INTO crypto_deposits (user_id, coin, network, amount, address, status, note)
              VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        args: [session.userId!, cryptoInfo.coin, cryptoInfo.network || "network", Number(amount), cryptoInfo.address, noteText],
      });
      // ملاحظة تشغيلية: في الإنتاج يُربط النظام بمراقب بلوكشين حقيقي
      // (مثل NowPayments أو CoinPayments — مجانيان وبدون هوية) عبر مهمة دورية
      // تتحقق من المعاملة وتشحن الرصيد تلقائيًا دون أي تدخل يدوي.
    }

    return NextResponse.json({ message: cryptoInfo ? "تم إنشاء طلب الشحن — سيتم التحقق من المعاملة وشحن رصيدك تلقائيًا" : "تم إرسال طلب الشحن، سيتم المراجعة قريباً" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
