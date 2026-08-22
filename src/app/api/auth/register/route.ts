import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "استخدم تسجيل البريد الإلكتروني الرسمي عبر Firebase من صفحة الدخول.",
      code: "FIREBASE_EMAIL_FLOW_REQUIRED",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    },
  );
}
