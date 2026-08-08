import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getStoreSettings, setStoreSettings, cleanPhone } from "@/lib/asiacell";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getStoreSettings();
    return NextResponse.json({
      store_phone: settings.store_phone,
      exchange_rate: settings.exchange_rate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const action = body.action;

    if (action === "set-store-phone") {
      const phone = cleanPhone(body.phone || "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      await setStoreSettings({ store_phone: phone, phone });
      return NextResponse.json({ success: true, store_phone: phone });
    }

    if (action === "set-rate") {
      const rate = parseInt(body.rate, 10);
      if (!rate || rate <= 0) {
        return NextResponse.json({ error: "سعر الصرف غير صالح" }, { status: 400 });
      }
      await setStoreSettings({ exchange_rate: rate });
      return NextResponse.json({ success: true, exchange_rate: rate });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("[Asiacell Admin]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
