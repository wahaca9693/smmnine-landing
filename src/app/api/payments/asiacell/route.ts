import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  AC_API,
  getHeaders,
  getStoreSettings,
  extractTopupAmount,
  iqdToUsd,
  creditUser,
  cleanPhone,
  createCustomerSession,
  getCustomerSession,
  updateCustomerSession,
  deleteCustomerSession,
  setUserVerifiedPhone,
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
    await requireAuth();
    const settings = await getStoreSettings();
    return NextResponse.json({
      connected: !!settings.store_phone,
      store_phone: settings.store_phone,
      exchange_rate: settings.exchange_rate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userSession = await requireAuth();
    const body = await request.json();
    const action = body.action;
    const settings = await getStoreSettings();

    if (action === "estimate") {
      const iqd = parseInt(body.amount, 10);
      if (!iqd || iqd <= 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
      const usd = iqdToUsd(iqd, settings.exchange_rate);
      return NextResponse.json({ iqd, usd, exchange_rate: settings.exchange_rate });
    }

    if (action === "login") {
      const phone = cleanPhone(body.phone || "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      const deviceId = randomUUID();
      const r = await fetch(`${AC_API}/api/v1/login?lang=en`, {
        method: "POST",
        headers: getHeaders(deviceId),
        body: JSON.stringify({ captchaCode: "", username: phone }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      if (!data) {
        console.error("[Asiacell Login] Non-JSON:", text.slice(0, 200));
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - حاول مرة أخرى" }, { status: 502 });
      }
      const pidMatch = (data.nextUrl || "").match(/PID=([^&]+)/);
      const pid = pidMatch ? pidMatch[1] : "";
      const sessionId = await createCustomerSession(userSession.userId!, phone, deviceId, pid);
      return NextResponse.json({ success: true, sessionId, message: data.message || "تم إرسال رمز التحقق" });
    }

    if (action === "verify-otp") {
      const session = await getCustomerSession(body.sessionId);
      if (!session) return NextResponse.json({ error: "الجلسة منتهية" }, { status: 400 });
      const r = await fetch(`${AC_API}/api/v1/smsvalidation?lang=en`, {
        method: "POST",
        headers: getHeaders(session.device_id),
        body: JSON.stringify({ PID: session.pid, passcode: body.otp, token: "" }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      if (!data) {
        console.error("[Asiacell Verify] Non-JSON:", text.slice(0, 200));
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - حاول مرة أخرى" }, { status: 502 });
      }
      if (data.access_token) {
        await updateCustomerSession(session.id, { access_token: data.access_token, step: "authenticated" });
        await setUserVerifiedPhone(userSession.userId!, session.phone);
        return NextResponse.json({ success: true, message: "تم التحقق بنجاح" });
      }
      return NextResponse.json({ success: false, message: data.message || "رمز التحقق غير صحيح" });
    }

    if (action === "topup") {
      const session = await getCustomerSession(body.sessionId);
      if (!session || !session.access_token) {
        return NextResponse.json({ error: "الجلسة منتهية أو لم يتم التحقق" }, { status: 400 });
      }
      const voucher = String(body.voucher || "").trim();
      if (!voucher || voucher.length < 4) {
        return NextResponse.json({ error: "رقم الكارت مطلوب" }, { status: 400 });
      }

      const r = await fetch(`${AC_API}/api/v1/top-up?lang=ar&theme=avocado`, {
        method: "POST",
        headers: getHeaders(session.device_id, session.access_token),
        body: JSON.stringify({ msisdn: "", rechargeType: 1, voucher }),
      });
      const { json: topupData, text: topupText } = await parseExternalResponse(r);
      console.log("[Asiacell TopUp]", JSON.stringify(topupData || topupText.slice(0, 200)));

      if (!topupData) {
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - حاول مرة أخرى" }, { status: 502 });
      }

      if (!topupData.success) {
        return NextResponse.json({ success: false, message: topupData.message || "فشل شحن الكارت - تأكد من الرقم" });
      }

      const amountIQD = extractTopupAmount(topupData);
      if (!amountIQD || amountIQD <= 0) {
        return NextResponse.json({ success: false, message: "تم شحن الكارت لكن لم يتم تحديد المبلغ - تواصل مع الإدارة" });
      }

      const creditAmount = iqdToUsd(amountIQD, settings.exchange_rate);
      if (creditAmount > 0) {
        await creditUser(userSession.userId!, creditAmount, "asiacell", `شحن كرت آسياسيل بقيمة ${amountIQD} د.ع`, `card_${voucher.slice(-4)}_${Date.now()}`);
      }
      await deleteCustomerSession(session.id);
      return NextResponse.json({ success: true, amountIQD, credited: creditAmount, message: `تم شحن الكرت وإضافة $${creditAmount} لرصيدك` });
    }

    if (action === "transfer") {
      const session = await getCustomerSession(body.sessionId);
      if (!session || !session.access_token) {
        return NextResponse.json({ error: "الجلسة منتهية أو لم يتم التحقق" }, { status: 400 });
      }
      if (!settings.store_phone) {
        return NextResponse.json({ error: "رقم المتجر غير مضبوط - تواصل مع الإدارة" }, { status: 400 });
      }
      const amountIQD = parseInt(body.amount, 10);
      if (!amountIQD || amountIQD < 250) {
        return NextResponse.json({ error: "الحد الأدنى للتحويل 250 د.ع" }, { status: 400 });
      }

      const r = await fetch(`${AC_API}/api/v1/credit-transfer/start?lang=ar`, {
        method: "POST",
        headers: getHeaders(session.device_id, session.access_token),
        body: JSON.stringify({ amount: amountIQD, receiverMsisdn: settings.store_phone }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      console.log("[Asiacell Transfer Start]", JSON.stringify(data || text.slice(0, 200)));

      if (!data) {
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - ربما الموقع يواجه ضغطاً. حاول مرة أخرى." }, { status: 502 });
      }

      const transferPid = data.PID || data.pid || "";
      if (!transferPid) {
        return NextResponse.json({
          success: false,
          message: data.message || data.error || "فشل بدء التحويل",
          response: data,
        });
      }

      await updateCustomerSession(session.id, { transfer_pid: transferPid, amount: amountIQD, step: "awaiting_transfer_otp" });
      return NextResponse.json({
        success: true,
        message: "تم بدء التحويل. أدخل رمز التأكيد الذي وصلك من آسيا سيل.",
        response: data,
      });
    }

    if (action === "confirm") {
      const session = await getCustomerSession(body.sessionId);
      if (!session || !session.access_token || !session.transfer_pid) {
        return NextResponse.json({ error: "الجلسة منتهية أو لم يتم بدء التحويل" }, { status: 400 });
      }
      const otp = String(body.otp || "").trim();
      if (!otp) return NextResponse.json({ error: "رمز التأكيد مطلوب" }, { status: 400 });

      const r = await fetch(`${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`, {
        method: "POST",
        headers: getHeaders(session.device_id, session.access_token),
        body: JSON.stringify({ PID: session.transfer_pid, passcode: otp }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      console.log("[Asiacell Transfer Confirm]", JSON.stringify(data || text.slice(0, 200)));

      if (!data) {
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - حاول مرة أخرى" }, { status: 502 });
      }

      if (!data.success) {
        return NextResponse.json({ success: false, message: data.message || data.error || "فشل تأكيد التحويل" });
      }

      const creditAmount = iqdToUsd(session.amount, settings.exchange_rate);
      if (creditAmount > 0) {
        await creditUser(userSession.userId!, creditAmount, "asiacell", `تحويل رصيد آسياسيل بقيمة ${session.amount} د.ع`, `transfer_${session.phone}_${Date.now()}`);
      }
      await deleteCustomerSession(session.id);
      return NextResponse.json({ success: true, credited: creditAmount, message: "تم التحويل بنجاح" });
    }

    if (action === "resend") {
      const session = await getCustomerSession(body.sessionId);
      if (!session || !session.access_token || !session.transfer_pid) {
        return NextResponse.json({ error: "الجلسة منتهية أو لم يتم بدء التحويل" }, { status: 400 });
      }
      const r = await fetch(`${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`, {
        method: "POST",
        headers: getHeaders(session.device_id, session.access_token),
        body: JSON.stringify({ PID: session.transfer_pid, passcode: "" }),
      });
      const { json: data, text } = await parseExternalResponse(r);
      if (!data) {
        return NextResponse.json({ error: "رد غير متوقع من Asiacell" }, { status: 502 });
      }
      return NextResponse.json({ success: true, message: data.message || "تم إعادة إرسال الرمز" });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("[Asiacell Customer]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
