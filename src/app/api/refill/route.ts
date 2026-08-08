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
    const orderId = body.order;

    if (!orderId) {
      return NextResponse.json(
        { error: "يرجى إرسال رقم الطلب" },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(String(orderId))) {
      return NextResponse.json(
        { error: "رقم الطلب يجب أن يكون رقمًا" },
        { status: 400 }
      );
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: API_KEY,
        action: "refill",
        order: String(orderId),
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || "فشل طلب إعادة التعبئة" },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      refill: data.refill,
      message: "تم إرسال طلب إعادة التعبئة بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء إعادة التعبئة" },
      { status: 500 }
    );
  }
}
