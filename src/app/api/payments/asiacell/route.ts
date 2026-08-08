import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  AC_API,
  getHeaders,
  getTopupHeaders,
  getAdminRow,
  extractTopupAmount,
  isSuccessResponse,
  creditUser,
  cleanPhone,
  createCustomerSession,
  getCustomerSession,
  updateCustomerSession,
  deleteCustomerSession,
  setUserVerifiedPhone,
} from "@/lib/asiacell";
import { randomUUID } from "crypto";

async function asiacellFetch(url: string, options: RequestInit, deviceId: string, accessToken?: string | null, customHeaders?: Record<string, string>, retries = 1): Promise<{ response: Response; text: string; json: any | null }> {
  let headers: Record<string, string>;
  if (customHeaders) {
    headers = { ...customHeaders };
  } else {
    headers = accessToken ? getHeaders(deviceId, accessToken) : getHeaders(deviceId);
  }

  console.log(`[Asiacell Request] ${options.method || "GET"} ${url}`);
  console.log(`[Asiacell Headers]`, JSON.stringify(headers, null, 2));
  if (options.body) console.log(`[Asiacell Body]`, options.body);

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();

  console.log(`[Asiacell Response] ${response.status} ${url}`);
  console.log(`[Asiacell Response Text]`, text.slice(0, 1000));

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!json && retries > 0) {
    console.log(`[Asiacell Retry] HTML/non-JSON response, retrying without Host header...`);
    const retryHeaders: Record<string, string> = { ...headers };
    delete retryHeaders.Host;
    retryHeaders.Accept = "application/json";

    const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
    const retryText = await retryResponse.text();

    console.log(`[Asiacell Retry Response] ${retryResponse.status}`);
    console.log(`[Asiacell Retry Response Text]`, retryText.slice(0, 1000));

    let retryJson: any = null;
    try {
      retryJson = JSON.parse(retryText);
    } catch {
      retryJson = null;
    }

    return { response: retryResponse, text: retryText, json: retryJson };
  }

  return { response, text, json };
}

export async function GET() {
  try {
    await requireAuth();
    const admin = await getAdminRow();
    return NextResponse.json({
      connected: !!admin?.store_phone || !!admin?.phone,
      admin_connected: !!admin?.authenticated,
      store_phone: admin?.store_phone || admin?.phone || "",
      exchange_rate: admin?.exchange_rate || 1666,
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
    const admin = await getAdminRow();

    if (action === "login") {
      const phone = cleanPhone(body.phone || "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      const deviceId = randomUUID();
      const { json: data, text } = await asiacellFetch(
        `${AC_API}/api/v1/login?lang=ar`,
        { method: "POST", body: JSON.stringify({ captchaCode: "", username: phone }) },
        deviceId
      );
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
      const { json: data, text } = await asiacellFetch(
        `${AC_API}/api/v1/smsvalidation?lang=ar`,
        { method: "POST", body: JSON.stringify({ PID: session.pid, passcode: body.otp }) },
        session.device_id
      );
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
      const effectiveToken = session?.access_token || admin?.access_token || "";
      const effectiveDeviceId = session?.device_id || admin?.device_id || "";

      if (!effectiveToken || !effectiveDeviceId) {
        return NextResponse.json({ error: "بوابة آسياسيل غير متصلة - تواصل مع الإدارة" }, { status: 400 });
      }

      const voucher = String(body.voucher || "").trim();
      if (!voucher || voucher.length < 4) {
        return NextResponse.json({ error: "رقم الكارت مطلوب" }, { status: 400 });
      }

      const { json: topupData, text: topupText } = await asiacellFetch(
        `${AC_API}/api/v1/top-up?lang=ar&theme=avocado`,
        { method: "POST", body: JSON.stringify({ msisdn: "", rechargeType: 1, voucher }) },
        effectiveDeviceId,
        undefined,
        getTopupHeaders(effectiveDeviceId, effectiveToken)
      );

      if (!topupData) {
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - حاول مرة أخرى" }, { status: 502 });
      }

      if (!isSuccessResponse(topupData)) {
        return NextResponse.json({ success: false, message: topupData.message || "فشل شحن الكارت - تأكد من الرقم" });
      }

      const finalAmount = extractTopupAmount(topupData);
      if (!finalAmount || finalAmount <= 0) {
        return NextResponse.json({ success: false, message: "تم شحن الكارت لكن لم يتم تحديد المبلغ - تواصل مع الإدارة" });
      }

      const creditAmount = finalAmount;
      if (creditAmount > 0) {
        await creditUser(userSession.userId!, creditAmount, "asiacell", `شحن كرت آسياسيل بقيمة ${finalAmount}`, `card_${voucher.slice(-4)}_${Date.now()}`);
      }
      if (session) await deleteCustomerSession(session.id);
      return NextResponse.json({ success: true, amountIQD: finalAmount, credited: creditAmount, message: `تم شحن الكرت وإضافة ${creditAmount} لرصيدك` });
    }

    if (action === "transfer") {
      const session = await getCustomerSession(body.sessionId);
      if (!session || !session.access_token) {
        return NextResponse.json({ error: "الجلسة منتهية أو لم يتم التحقق" }, { status: 400 });
      }
      const storePhone = admin?.store_phone || admin?.phone;
      if (!storePhone) {
        return NextResponse.json({ error: "رقم المتجر غير مضبوط - تواصل مع الإدارة" }, { status: 400 });
      }
      const amountIQD = parseInt(body.amount, 10);
      if (!amountIQD || amountIQD < 250) {
        return NextResponse.json({ error: "الحد الأدنى للتحويل 250 د.ع" }, { status: 400 });
      }

      const { json: data, text } = await asiacellFetch(
        `${AC_API}/api/v1/credit-transfer/start?lang=ar`,
        { method: "POST", body: JSON.stringify({ amount: amountIQD, receiverMsisdn: storePhone }) },
        session.device_id,
        session.access_token
      );

      if (!data) {
        console.error("[Asiacell Transfer Start] Non-JSON:", text.slice(0, 200));
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - ربما الموقع يواجه ضغطاً. حاول مرة أخرى." }, { status: 502 });
      }

      if (!isSuccessResponse(data)) {
        return NextResponse.json({ success: false, message: data.message || data.error || "فشل بدء التحويل" });
      }

      const transferPid = data.PID || data.pid || "";
      if (!transferPid) {
        return NextResponse.json({
          success: false,
          message: data.message || data.error || "فشل بدء التحويل - لم يتم الحصول على PID",
          response: data,
        });
      }

      await updateCustomerSession(session.id, { transfer_pid: transferPid, amount: amountIQD, step: "awaiting_transfer_otp" });
      return NextResponse.json({
        success: true,
        message: data.message || "تم بدء التحويل. أدخل رمز التأكيد الذي وصلك من آسيا سيل.",
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

      const { json: data, text } = await asiacellFetch(
        `${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`,
        { method: "POST", body: JSON.stringify({ PID: session.transfer_pid, passcode: otp }) },
        session.device_id,
        session.access_token
      );

      if (!data) {
        console.error("[Asiacell Transfer Confirm] Non-JSON:", text.slice(0, 200));
        return NextResponse.json({ error: "رد غير متوقع من Asiacell - حاول مرة أخرى" }, { status: 502 });
      }

      const transactionCompleted = isSuccessResponse(data);
      if (!transactionCompleted) {
        return NextResponse.json({ success: false, message: data.message || data.error || "فشل تأكيد التحويل" });
      }

      const creditAmount = session.amount;
      if (creditAmount > 0) {
        await creditUser(userSession.userId!, creditAmount, "asiacell", `تحويل رصيد آسياسيل بقيمة ${session.amount}`, `transfer_${session.phone}_${Date.now()}`);
      }
      await deleteCustomerSession(session.id);
      return NextResponse.json({ success: true, credited: creditAmount, message: `تم التحويل بنجاح! تمت إضافة ${creditAmount} لرصيدك.` });
    }

    if (action === "resend") {
      const session = await getCustomerSession(body.sessionId);
      if (!session || !session.access_token || !session.transfer_pid) {
        return NextResponse.json({ error: "الجلسة منتهية أو لم يتم بدء التحويل" }, { status: 400 });
      }
      const { json: data, text } = await asiacellFetch(
        `${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`,
        { method: "POST", body: JSON.stringify({ PID: session.transfer_pid, passcode: "" }) },
        session.device_id,
        session.access_token
      );
      if (!data) {
        console.error("[Asiacell Resend] Non-JSON:", text.slice(0, 200));
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
