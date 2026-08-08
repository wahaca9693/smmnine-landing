import { db } from "./db";
import { randomUUID } from "crypto";

export const AC_API = "https://odpapp.asiacell.com";
export const AC_API_KEY = "1ccbc4c913bc4ce785a0a2de444aa0d6";

export const BASE_HEADERS: Record<string, string> = {
  Host: "odpapp.asiacell.com",
  "X-Odp-Api-Key": AC_API_KEY,
  "Cache-Control": "no-cache",
  "X-Os-Version": "9",
  "X-Device-Type": "[Android][google][G011A 9][P][HMS][4.2.1:90000263]",
  "X-Odp-App-Version": "4.2.1",
  "X-From-App": "odp",
  "X-Odp-Channel": "mobile",
  "X-Screen-Type": "false",
  "Content-Type": "application/json; charset=UTF-8",
  "User-Agent": "okhttp/5.0.0-alpha.2",
  Connection: "keep-alive",
};

export interface AdminSession {
  id: number;
  phone: string;
  device_id: string;
  access_token: string;
  pid: string;
  authenticated: number;
  exchange_rate: number;
  store_phone: string;
  updated_at: string;
}

export interface CustomerSession {
  id: string;
  user_id: number;
  phone: string;
  device_id: string;
  access_token: string | null;
  pid: string;
  amount: number;
  transfer_pid: string;
  username: string;
  step: string;
  created_at: string;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export function authHeaders(deviceId: string, accessToken: string): Record<string, string> {
  return {
    ...BASE_HEADERS,
    Deviceid: deviceId,
    Authorization: `Bearer ${accessToken}`,
    "X-Screen-Type": "MOBILE",
  };
}

export function topupHeaders(deviceId: string, accessToken: string): Record<string, string> {
  return {
    Host: "odpapp.asiacell.com",
    "Cache-Control": "no-cache",
    Deviceid: deviceId,
    "X-Os-Version": "9",
    "X-Device-Type": "[Android][google][G011A 9][P][HMS][4.2.1:90000263]",
    "X-Odp-App-Version": "4.2.1",
    "X-From-App": "odp",
    "X-Odp-Channel": "mobile",
    "X-Screen-Type": "MOBILE",
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/5.0.0-alpha.2",
    Connection: "keep-alive",
  };
}

export function loginHeaders(deviceId: string): Record<string, string> {
  return { ...BASE_HEADERS, Deviceid: deviceId };
}

export async function asiacellFetch(
  url: string,
  options: RequestInit,
  headers: Record<string, string>
): Promise<{ response: Response; text: string; json: any | null }> {
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

  return { response, text, json };
}

export async function retryAsiacellFetch(
  url: string,
  options: RequestInit,
  headers: Record<string, string>
): Promise<{ response: Response; text: string; json: any | null }> {
  let result = await asiacellFetch(url, options, headers);

  if (!result.json) {
    console.log(`[Asiacell Retry] Non-JSON response, retrying without Host header...`);
    const retryHeaders = { ...headers };
    delete retryHeaders.Host;
    retryHeaders.Accept = "application/json";
    result = await asiacellFetch(url, options, retryHeaders);
  }

  return result;
}

export function isSuccessResponse(data: any): boolean {
  if (!data) return false;
  if (data.success === true) return true;
  const msg = String(data.message || "").toLowerCase();
  if (msg.includes("نجاح") || msg.includes("تمت") || msg.includes("success")) return true;
  return false;
}

// ========== ADMIN SESSION (persisted in DB) ==========

export async function getAdminRow(): Promise<AdminSession | null> {
  const result = await db.execute("SELECT * FROM asiacell_admin WHERE id = 1");
  const row = result.rows[0] as any;
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    authenticated: Number(row.authenticated),
    exchange_rate: Number(row.exchange_rate),
  } as AdminSession;
}

export async function setAdminRow(data: Partial<AdminSession>): Promise<void> {
  const existing = await getAdminRow();
  if (!existing) {
    await db.execute({
      sql: `INSERT INTO asiacell_admin (id, phone, device_id, access_token, pid, authenticated, exchange_rate, store_phone)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.phone || "",
        data.device_id || "",
        data.access_token || "",
        data.pid || "",
        data.authenticated ?? 0,
        data.exchange_rate ?? 1666,
        data.store_phone || data.phone || "",
      ],
    });
  } else {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return;
    values.push(1);
    await db.execute({
      sql: `UPDATE asiacell_admin SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: values,
    });
  }
}

export async function adminLogin(phone: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const clean = cleanPhone(phone);
  if (!/^07\d{9}$/.test(clean)) {
    return { success: false, error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" };
  }

  const deviceId = randomUUID();
  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/login?lang=ar`,
    { method: "POST", body: JSON.stringify({ captchaCode: "", username: clean }) },
    loginHeaders(deviceId)
  );

  if (!data) {
    console.error("[Asiacell Admin Login] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  const pidMatch = (data.nextUrl || "").match(/PID=([^&]+)/);
  const pid = pidMatch ? pidMatch[1] : "";
  await setAdminRow({ phone: clean, device_id: deviceId, access_token: "", pid, authenticated: 0, store_phone: clean });

  return { success: true, message: data.message || "تم إرسال رمز التحقق" };
}

export async function adminVerify(otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const admin = await getAdminRow();
  if (!admin) return { success: false, error: "قم بتسجيل الدخول أولاً" };

  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/smsvalidation?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: admin.pid, passcode: otp }) },
    loginHeaders(admin.device_id)
  );

  if (!data) {
    console.error("[Asiacell Admin Verify] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell" };
  }

  if (data.access_token) {
    await setAdminRow({ access_token: data.access_token, authenticated: 1 });
    return { success: true, message: "تم ربط البوابة بنجاح" };
  }
  return { success: false, message: data.message || "رمز التحقق غير صحيح" };
}

export async function adminLogout(): Promise<void> {
  await setAdminRow({ phone: "", device_id: "", access_token: "", pid: "", authenticated: 0, store_phone: "" });
}

// ========== CUSTOMER SESSION ==========

export async function createCustomerSession(userId: number, phone: string, deviceId: string, pid: string): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO asiacell_sessions (id, user_id, phone, device_id, pid, step)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, cleanPhone(phone), deviceId, pid, "otp_sent"],
  });
  return id;
}

export async function getCustomerSession(id: string): Promise<CustomerSession | null> {
  const result = await db.execute({ sql: "SELECT * FROM asiacell_sessions WHERE id = ?", args: [id] });
  const row = result.rows[0] as any;
  if (!row) return null;
  return { ...row, user_id: Number(row.user_id), amount: Number(row.amount) } as CustomerSession;
}

export async function updateCustomerSession(id: string, data: Partial<CustomerSession>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.execute({ sql: `UPDATE asiacell_sessions SET ${fields.join(", ")} WHERE id = ?`, args: values });
}

export async function deleteCustomerSession(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM asiacell_sessions WHERE id = ?", args: [id] });
}

export async function setUserVerifiedPhone(userId: number, phone: string): Promise<void> {
  await db.execute({ sql: "UPDATE users SET verified_phone = ? WHERE id = ?", args: [cleanPhone(phone), userId] });
}

export async function creditUser(userId: number, amount: number, method: string, description: string, paymentId: string): Promise<void> {
  await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [amount, userId] });
  await db.execute({
    sql: `INSERT INTO transactions (user_id, type, amount, status, description, method)
          VALUES (?, 'deposit', ?, 'completed', ?, ?)`,
    args: [userId, amount, description, method],
  });
}

// ========== CUSTOMER OPERATIONS ==========

export async function customerLogin(userId: number, phone: string): Promise<{ success: boolean; sessionId?: string; message?: string; error?: string }> {
  const clean = cleanPhone(phone);
  if (!/^07\d{9}$/.test(clean)) {
    return { success: false, error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" };
  }

  const deviceId = randomUUID();
  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/login?lang=ar`,
    { method: "POST", body: JSON.stringify({ captchaCode: "", username: clean }) },
    loginHeaders(deviceId)
  );

  if (!data) {
    console.error("[Asiacell Customer Login] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  const pidMatch = (data.nextUrl || "").match(/PID=([^&]+)/);
  const pid = pidMatch ? pidMatch[1] : "";
  const sessionId = await createCustomerSession(userId, clean, deviceId, pid);
  return { success: true, sessionId, message: data.message || "تم إرسال رمز التحقق" };
}

export async function customerVerify(sessionId: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session) return { success: false, error: "الجلسة منتهية" };

  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/smsvalidation?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: session.pid, passcode: otp }) },
    loginHeaders(session.device_id)
  );

  if (!data) {
    console.error("[Asiacell Customer Verify] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  if (data.access_token) {
    await updateCustomerSession(session.id, { access_token: data.access_token, step: "authenticated" });
    await setUserVerifiedPhone(session.user_id, session.phone);
    return { success: true, message: "تم التحقق بنجاح" };
  }
  return { success: false, message: data.message || "رمز التحقق غير صحيح" };
}

export function extractTopupAmount(data: any): number {
  if (data?.analyticData?.params?.["Recharge Amount"]) {
    return Math.floor(parseFloat(String(data.analyticData.params["Recharge Amount"])));
  }
  if (data?.data?.amount) return Math.floor(parseFloat(String(data.data.amount)));
  if (data?.amount) return Math.floor(parseFloat(String(data.amount)));
  return 0;
}

export async function topupCard(userId: number, sessionId: string | undefined, voucher: string, admin?: AdminSession | null): Promise<{ success: boolean; credited?: number; amountIQD?: number; message?: string; error?: string }> {
  let session: CustomerSession | null = null;
  if (sessionId) session = await getCustomerSession(sessionId);

  const effectiveToken = session?.access_token || admin?.access_token || "";
  const effectiveDeviceId = session?.device_id || admin?.device_id || "";

  if (!effectiveToken || !effectiveDeviceId) {
    return { success: false, error: "بوابة آسياسيل غير متصلة - تواصل مع الإدارة" };
  }

  const v = String(voucher || "").trim();
  if (!v || v.length < 4) return { success: false, error: "رقم الكارت مطلوب" };

  const { json: topupData, text: topupText } = await retryAsiacellFetch(
    `${AC_API}/api/v1/top-up?lang=ar&theme=avocado`,
    { method: "POST", body: JSON.stringify({ msisdn: "", rechargeType: 1, voucher: v }) },
    topupHeaders(effectiveDeviceId, effectiveToken)
  );

  if (!topupData) {
    console.error("[Asiacell TopUp] Non-JSON:", topupText.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  if (!isSuccessResponse(topupData)) {
    return { success: false, message: topupData.message || "فشل شحن الكارت - تأكد من الرقم" };
  }

  const finalAmount = extractTopupAmount(topupData);
  if (!finalAmount || finalAmount <= 0) {
    return { success: false, message: "تم شحن الكارت لكن لم يتم تحديد المبلغ - تواصل مع الإدارة" };
  }

  await creditUser(userId, finalAmount, "asiacell", `شحن كرت آسياسيل بقيمة ${finalAmount}`, `card_${v.slice(-4)}_${Date.now()}`);
  if (session) await deleteCustomerSession(session.id);

  return { success: true, amountIQD: finalAmount, credited: finalAmount, message: `تم شحن الكرت وإضافة ${finalAmount} لرصيدك` };
}

export async function startTransfer(
  userId: number,
  sessionId: string,
  amountIQD: number,
  admin?: AdminSession | null
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session || !session.access_token) return { success: false, error: "الجلسة منتهية أو لم يتم التحقق" };

  const storePhone = admin?.store_phone || admin?.phone;
  if (!storePhone) return { success: false, error: "رقم المتجر غير مضبوط - تواصل مع الإدارة" };

  if (!amountIQD || amountIQD < 250) return { success: false, error: "الحد الأدنى للتحويل 250 د.ع" };

  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/credit-transfer/start?lang=ar`,
    { method: "POST", body: JSON.stringify({ amount: amountIQD, receiverMsisdn: storePhone }) },
    authHeaders(session.device_id, session.access_token)
  );

  if (!data) {
    console.error("[Asiacell Transfer Start] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell - ربما الموقع يواجه ضغطاً. حاول مرة أخرى." };
  }

  if (!isSuccessResponse(data)) {
    return { success: false, message: data.message || data.error || "فشل بدء التحويل" };
  }

  const transferPid = data.PID || data.pid || "";
  if (!transferPid) {
    return { success: false, message: data.message || data.error || "فشل بدء التحويل - لم يتم الحصول على PID" };
  }

  await updateCustomerSession(session.id, { transfer_pid: transferPid, amount: amountIQD, step: "awaiting_transfer_otp" });
  return { success: true, message: data.message || "تم بدء التحويل. أدخل رمز التأكيد الذي وصلك من آسيا سيل." };
}

export async function confirmTransfer(userId: number, sessionId: string, otp: string): Promise<{ success: boolean; credited?: number; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session || !session.access_token || !session.transfer_pid) {
    return { success: false, error: "الجلسة منتهية أو لم يتم بدء التحويل" };
  }

  const o = String(otp || "").trim();
  if (!o) return { success: false, error: "رمز التأكيد مطلوب" };

  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: session.transfer_pid, passcode: o }) },
    authHeaders(session.device_id, session.access_token)
  );

  if (!data) {
    console.error("[Asiacell Transfer Confirm] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  if (!isSuccessResponse(data)) {
    return { success: false, message: data.message || data.error || "فشل تأكيد التحويل" };
  }

  await creditUser(userId, session.amount, "asiacell", `تحويل رصيد آسياسيل بقيمة ${session.amount}`, `transfer_${session.phone}_${Date.now()}`);
  await deleteCustomerSession(session.id);

  return { success: true, credited: session.amount, message: `تم التحويل بنجاح! تمت إضافة ${session.amount} لرصيدك.` };
}

export async function resendTransferOtp(sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session || !session.access_token || !session.transfer_pid) {
    return { success: false, error: "الجلسة منتهية أو لم يتم بدء التحويل" };
  }

  const { json: data, text } = await retryAsiacellFetch(
    `${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: session.transfer_pid, passcode: "" }) },
    authHeaders(session.device_id, session.access_token)
  );

  if (!data) {
    console.error("[Asiacell Resend] Non-JSON:", text.slice(0, 200));
    return { success: false, error: "رد غير متوقع من Asiacell" };
  }
  return { success: true, message: data.message || "تم إعادة إرسال الرمز" };
}

// ========== RECORDS POLLING ==========

const processedTransfers = new Set<string>();

export async function checkRecordsAndCredit(): Promise<{ checked: boolean; processed?: number; total?: number; reason?: string; error?: string }> {
  const admin = await getAdminRow();
  if (!admin?.authenticated || !admin.access_token) {
    return { checked: false, reason: "Admin not authenticated" };
  }

  try {
    const { json: data, text } = await retryAsiacellFetch(
      `${AC_API}/api/v1/cdr/detail?type=sms&page=1&limit=50&lang=ar&theme=avocado`,
      { method: "GET" },
      authHeaders(admin.device_id, admin.access_token)
    );

    if (!data) {
      console.error("[Asiacell Records] Non-JSON:", text.slice(0, 200));
      return { checked: false, error: "Non-JSON response" };
    }

    if (!data?.data || !Array.isArray(data.data)) {
      if (data?.status === 401 || String(data?.message || "").toLowerCase().includes("unauthorized")) {
        await setAdminRow({ authenticated: 0 });
      }
      return { checked: true, processed: 0, error: "No records data" };
    }

    let processed = 0;
    for (const record of data.data) {
      const recordId = record.id || record.transactionId || `${record.date}_${record.otherParty}`;
      if (processedTransfers.has(recordId)) continue;

      const msg = record.message || record.description || record.text || "";
      const sender = record.otherParty || record.from || record.number || "";
      const amountMatch = String(msg).match(/(\d+)/);
      const isTransfer =
        String(msg).includes("تحويل") ||
        String(msg).includes("رصيد") ||
        String(msg).toLowerCase().includes("transfer") ||
        String(msg).toLowerCase().includes("balance");

      if (isTransfer && amountMatch && sender) {
        const amount = parseInt(amountMatch[1]);
        if (amount > 0) {
          const cleanSender = cleanPhone(sender);
          const result = await db.execute({
            sql: "SELECT id, username, balance FROM users WHERE verified_phone = ? OR verified_phone LIKE ?",
            args: [cleanSender, `%${cleanSender.slice(-10)}`],
          });

          if (result.rows.length > 0) {
            const user = result.rows[0] as any;
            await creditUser(Number(user.id), amount, "asiacell", `تحويل وارد من ${sender} بقيمة ${amount}`, recordId);
            processed++;
          }
        }
      }
      processedTransfers.add(recordId);
    }

    return { checked: true, processed, total: data.data.length };
  } catch (err: any) {
    console.error("[Asiacell Records] Error:", err.message);
    return { checked: false, error: err.message };
  }
}
