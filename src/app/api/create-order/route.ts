import { NextResponse } from "next/server";

const API_URL = process.env.SMMNINE_API_URL || "https://smmnine.com/api/v2";
const API_KEY = process.env.SMMNINE_API_KEY;

export async function POST(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "مفتاح API غير مُهيأ" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { service, link, quantity } = body;

    if (!service || !link || !quantity) {
      return NextResponse.json(
        { error: "يرجى ملء جميع الحقول المطلوبة" },
        { status: 400 }
      );
    }

    const serviceId = String(service).trim();
    const linkValue = String(link).trim();
    const qtyValue = String(quantity).trim();

    if (!/^\d+$/.test(serviceId)) {
      return NextResponse.json(
        { error: "معرف الخدمة يجب أن يكون رقمًا" },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(qtyValue) || Number(qtyValue) < 1) {
      return NextResponse.json(
        { error: "الكمية يجب أن تكون رقمًا أكبر من صفر" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      key: API_KEY,
      action: "add",
      service: serviceId,
      link: linkValue,
      quantity: qtyValue,
    });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || "فشل إنشاء الطلب" },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({ order: data.order, status: "created" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء إنشاء الطلب" },
      { status: 500 }
    );
  }
}
