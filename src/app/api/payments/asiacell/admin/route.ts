import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  AC_API,
  getHeaders,
  cleanPhone,
  getAdminRow,
  setAdminRow,
  checkRecordsAndCredit,
} from "@/lib/asiacell";
import { randomUUID } from "crypto";

async function parseExternalResponse(r: Response) {
  const text = await r.text();
  try {
    return { text, json: JSON.parse(text), ok: r.ok };
  } catch {
    return { text, json: null, ok: r.ok };
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const admin = await getAdminRow();
    return NextResponse.json({
      authenticated: !!admin?.authenticated,
      phone: admin?.phone || "",
      exchange_rate: admin?.exchange_rate || 1666,
      store_phone: admin?.store_phone || admin?.phone || "",
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

    if (action === "login") {
      const phone = cleanPhone(body.phone || "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      const deviceId = randomUUID();
      const r = await fetch(`${AC_API}/api/v1/login?lang=ar`, {
        method: "POST",
        headers: getHeaders(deviceId),
        body: JSON.stringify({ captchaCode: "", username: phone }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      if (!data) {
        console.error("[Asiacell Admin Login] Non-JSON:", text.slice(0, 200));
        return NextResponse.json({ error: "رد غير متوقع من Asiacell" }, { status: 502 });
      }
      const pidMatch = (data.nextUrl || "").match(/PID=([^&]+)/);
      const pid = pidMatch ? pidMatch[1] : "";
      await setAdminRow({ phone, device_id: deviceId, access_token: "", pid, authenticated: 0, store_phone: phone });
      return NextResponse.json({ success: true, message: data.message || "تم إرسال رمز التحقق" });
    }

    if (action === "verify") {
      const admin = await getAdminRow();
      if (!admin) return NextResponse.json({ error: "قم بتسجيل الدخول أولاً" }, { status: 400 });
      const r = await fetch(`${AC_API}/api/v1/smsvalidation?lang=ar`, {
        method: "POST",
        headers: getHeaders(admin.device_id),
        body: JSON.stringify({ PID: admin.pid, passcode: body.otp }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      if (!data) {
        console.error("[Asiacell Admin Verify] Non-JSON:", text.slice(0, 200));
        return NextResponse.json({ error: "رد غير متوقع من Asiacell" }, { status: 502 });
      }
      if (data.access_token) {
        await setAdminRow({ access_token: data.access_token, authenticated: 1 });
        return NextResponse.json({ success: true, message: "تم ربط البوابة بنجاح" });
      }
      return NextResponse.json({ success: false, message: data.message || "رمز التحقق غير صحيح" });
    }

    if (action === "logout") {
      await setAdminRow({ phone: "", device_id: "", access_token: "", pid: "", authenticated: 0, store_phone: "" });
      return NextResponse.json({ success: true });
    }

    if (action === "set-store-phone") {
      const phone = cleanPhone(body.phone || "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      await setAdminRow({ store_phone: phone });
      return NextResponse.json({ success: true, store_phone: phone });
    }

    if (action === "set-rate") {
      const rate = parseInt(body.rate, 10);
      if (!rate || rate <= 0) {
        return NextResponse.json({ error: "سعر الصرف غير صالح" }, { status: 400 });
      }
      await setAdminRow({ exchange_rate: rate });
      return NextResponse.json({ success: true, exchange_rate: rate });
    }

    if (action === "check-records") {
      const result = await checkRecordsAndCredit();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("[Asiacell Admin]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
