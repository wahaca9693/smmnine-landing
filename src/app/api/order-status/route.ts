import { NextResponse } from "next/server";

const API_URL = process.env.SMMNINE_API_URL || "https://smmnine.com/api/v2";
const API_KEY = process.env.SMMNINE_API_KEY;

const statusMap: Record<string, string> = {
  Pending: "قيد الانتظار",
  "In progress": "قيد التنفيذ",
  Completed: "مكتمل",
  Partial: "جزئي",
  Canceled: "ملغي",
  Cancel: "ملغي",
  Fail: "فاشل",
  Refunded: "مسترد",
};

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
        action: "status",
        order: String(orderId),
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || "فشل جلب حالة الطلب" },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      ...data,
      status_ar: statusMap[data.status] || data.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء جلب الحالة" },
      { status: 500 }
    );
  }
}
