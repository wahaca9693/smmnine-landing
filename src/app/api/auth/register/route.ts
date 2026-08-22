import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "التسجيل الآن يتطلب تأكيد البريد أولًا. استخدم تدفق التسجيل المرحلي من صفحة الدخول.",
      code: "VERIFICATION_REQUIRED",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    },
  );
}
