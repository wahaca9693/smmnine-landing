import { NextResponse } from "next/server";

const API_URL = process.env.SMMNINE_API_URL || "https://smmnine.com/api/v2";
const API_KEY = process.env.SMMNINE_API_KEY;

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "مفتاح API غير مُهيأ" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: API_KEY, action: "balance" }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error || "فشل جلب الرصيد" },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "حدث خطأ أثناء الاتصال بالخادم" },
      { status: 500 }
    );
  }
}
