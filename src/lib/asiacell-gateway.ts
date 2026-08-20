import { db } from "./db";
import { randomUUID } from "crypto";
import fetch, { Response as FetchResponse } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

type JsonRecord = Record<string, unknown>;
type AsiacellResponse = { response: FetchResponse; text: string; json: JsonRecord | null };

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringField(data: JsonRecord, key: string): string {
  const value = data[key];
  return value === null || value === undefined ? "" : String(value);
}

export const AC_API = "https://app.asiacell.com";
export const ASIACELL_TRANSFER_FEE_IQD = 500;
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

function normalizeProxyUrl(proxy: string): string {
  const trimmed = proxy.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `http://${trimmed}`;
}

const ASIACELL_DEBUG = process.env.ASIACELL_DEBUG === "1";

function debugAsiacell(message: string, details?: unknown): void {
  if (!ASIACELL_DEBUG) return;
  if (details === undefined) {
    console.debug(`[Asiacell] ${message}`);
    return;
  }
  console.debug(`[Asiacell] ${message}`, details);
}

function getProxyUrl(): string | undefined {
  // Single proxy URL
  if (process.env.ASIACELL_PROXY_URL) return normalizeProxyUrl(process.env.ASIACELL_PROXY_URL);

  // Rotating proxy list (comma separated)
  const list = process.env.ASIACELL_PROXIES;
  if (list) {
    const proxies = list.split(",").map((p) => p.trim()).filter(Boolean);
    if (proxies.length > 0) {
      return normalizeProxyUrl(proxies[Math.floor(Math.random() * proxies.length)]);
    }
  }
  return undefined;
}

export async function asiacellFetch(
  url: string,
  options: RequestInit,
  headers: Record<string, string>
): Promise<AsiacellResponse> {
  const proxyUrl = getProxyUrl();
  const safeHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, /authorization|api-key/i.test(key) ? "***" : value]));
  debugAsiacell(`Request ${options.method || "GET"} ${url}`);
  debugAsiacell("Headers", JSON.stringify(safeHeaders));
  if (proxyUrl) debugAsiacell(`Proxy configured: ${proxyUrl.replace(/:\/\/[^@]+@/, "://***@")}`);

  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  const fetchOptions = { ...options, headers, agent } as Parameters<typeof fetch>[1];
  const response = await fetch(url, fetchOptions);
  const text = await response.text();

  debugAsiacell(`Response ${response.status} ${url}`);

  let json: JsonRecord | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    json = isJsonRecord(parsed) ? parsed : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

export async function retryAsiacellFetch(
  url: string,
  options: RequestInit,
  headers: Record<string, string>
): Promise<AsiacellResponse> {
  let result = await asiacellFetch(url, options, headers);

  if (!result.json) {
    debugAsiacell("Non-JSON response; retrying without Host header");
    const retryHeaders = { ...headers };
    delete retryHeaders.Host;
    retryHeaders.Accept = "application/json";
    result = await asiacellFetch(url, options, retryHeaders);
  }

  return result;
}

export function extractAsiacellError(data: JsonRecord | null): string {
  if (!data) return "فشل الاتصال بآسيا سيل";
  if (stringField(data, "message")) return stringField(data, "message");
  const nextAction = stringField(data, "nextAction");
  if (nextAction) {
    try {
      const url = new URL(nextAction, "https://example.com");
      const msg = url.searchParams.get("msg");
      if (msg) return decodeURIComponent(msg).replace(/\+/g, " ");
    } catch {}
  }
  return "فشلت العملية";
}

export function isSuccessResponse(data: JsonRecord | null): boolean {
  if (!data) return false;
  if (data.success === true) return true;
  const msg = stringField(data, "message").toLowerCase();
  if (msg.includes("نجاح") || msg.includes("تمت") || msg.includes("success")) return true;
  return false;
}

// ========== ADMIN SESSION (persisted in DB) ==========

export async function getAdminRow(): Promise<AdminSession | null> {
  const result = await db.execute("SELECT * FROM asiacell_admin WHERE id = 1");
  const row = result.rows[0] as JsonRecord | undefined;
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    authenticated: Number(row.authenticated),
    exchange_rate: Number(row.exchange_rate),
  } as unknown as AdminSession;
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
    const values: Array<string | number | null> = [];
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
  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/login?lang=ar`,
    { method: "POST", body: JSON.stringify({ captchaCode: "", username: clean }) },
    loginHeaders(deviceId)
  );

  if (!data) {
    debugAsiacell("Admin login returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  const pidMatch = stringField(data, "nextUrl").match(/PID=([^&]+)/);
  const pid = pidMatch ? pidMatch[1] : "";
  await setAdminRow({ phone: clean, device_id: deviceId, access_token: "", pid, authenticated: 0, store_phone: clean });

  return { success: true, message: stringField(data, "message") || "تم إرسال رمز التحقق" };
}

export async function adminVerify(otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const admin = await getAdminRow();
  if (!admin) return { success: false, error: "قم بتسجيل الدخول أولاً" };

  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/smsvalidation?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: admin.pid, passcode: otp }) },
    loginHeaders(admin.device_id)
  );

  if (!data) {
    debugAsiacell("Admin verification returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell" };
  }

  const accessToken = stringField(data, "access_token");
  if (accessToken) {
    await setAdminRow({ access_token: accessToken, authenticated: 1 });
    return { success: true, message: "تم ربط البوابة بنجاح" };
  }
  return { success: false, message: stringField(data, "message") || "رمز التحقق غير صحيح" };
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
  const row = result.rows[0] as JsonRecord | undefined;
  if (!row) return null;
  return { ...row, user_id: Number(row.user_id), amount: Number(row.amount) } as unknown as CustomerSession;
}

export async function updateCustomerSession(id: string, data: Partial<CustomerSession>): Promise<void> {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
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

export function getAsiacellExchangeRate(admin?: AdminSession | null): number {
  const configured = Number(admin?.exchange_rate);
  return Number.isFinite(configured) && configured > 0 ? configured : 1666;
}

export function convertIqdToUsd(amountIQD: number, exchangeRate: number): number {
  const value = Number(amountIQD) / Number(exchangeRate);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 10000) / 10000 : 0;
}

export async function creditUser(userId: number, amount: number, method: string, description: string, paymentId: string): Promise<void> {
  void paymentId;
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
  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/login?lang=ar`,
    { method: "POST", body: JSON.stringify({ captchaCode: "", username: clean }) },
    loginHeaders(deviceId)
  );

  if (!data) {
    debugAsiacell("Customer login returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  const pidMatch = stringField(data, "nextUrl").match(/PID=([^&]+)/);
  const pid = pidMatch ? pidMatch[1] : "";
  const sessionId = await createCustomerSession(userId, clean, deviceId, pid);
  return { success: true, sessionId, message: stringField(data, "message") || "تم إرسال رمز التحقق" };
}

export async function customerVerify(sessionId: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session) return { success: false, error: "الجلسة منتهية" };

  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/smsvalidation?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: session.pid, passcode: otp }) },
    loginHeaders(session.device_id)
  );

  if (!data) {
    debugAsiacell("Customer verification returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  const accessToken = stringField(data, "access_token");
  if (accessToken) {
    await updateCustomerSession(session.id, { access_token: accessToken, step: "authenticated" });
    await setUserVerifiedPhone(session.user_id, session.phone);
    return { success: true, message: "تم التحقق بنجاح" };
  }
  return { success: false, message: stringField(data, "message") || "رمز التحقق غير صحيح" };
}

export function extractTopupAmount(data: JsonRecord | null): number {
  if (!data) return 0;
  const analyticData = isJsonRecord(data.analyticData) ? data.analyticData : null;
  const params = analyticData && isJsonRecord(analyticData.params) ? analyticData.params : null;
  const rechargeAmount = params ? params["Recharge Amount"] : undefined;
  if (rechargeAmount) return Math.floor(parseFloat(String(rechargeAmount)));
  const nestedData = isJsonRecord(data.data) ? data.data : null;
  if (nestedData?.amount) return Math.floor(parseFloat(String(nestedData.amount)));
  if (data.amount) return Math.floor(parseFloat(String(data.amount)));
  return 0;
}

export async function topupCard(userId: number, sessionId: string | undefined, voucher: string, admin?: AdminSession | null): Promise<{ success: boolean; credited?: number; amountIQD?: number; exchangeRate?: number; message?: string; error?: string }> {
  let session: CustomerSession | null = null;
  if (sessionId) session = await getCustomerSession(sessionId);

  // البطاقة لا تحتاج جلسة OTP للمستخدم؛ عند غيابها نتحقق عبر حساب المتجر.
  // تبقى بيانات الاعتماد على الخادم ولا تُعاد إلى المتصفح.
  const effectiveToken = session?.access_token || admin?.access_token;
  const effectiveDeviceId = session?.device_id || admin?.device_id;
  if (!effectiveToken || !effectiveDeviceId) {
    return { success: false, error: "البوابة غير جاهزة للتحقق من البطاقة - تواصل مع الإدارة" };
  }

  const v = String(voucher || "").trim();
  if (!v || v.length < 4) return { success: false, error: "رقم الكارت مطلوب" };

  const { json: topupData } = await retryAsiacellFetch(
    `${AC_API}/api/v1/top-up?lang=ar&theme=avocado`,
    { method: "POST", body: JSON.stringify({ msisdn: "", rechargeType: 1, voucher: v }) },
    topupHeaders(effectiveDeviceId, effectiveToken)
  );

  if (!topupData) {
    debugAsiacell("Top-up returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  if (!isSuccessResponse(topupData)) {
    return { success: false, message: extractAsiacellError(topupData) || "فشل شحن الكارت - تأكد من الرقم" };
  }

  const finalAmount = extractTopupAmount(topupData);
  if (!finalAmount || finalAmount <= 0) {
    return { success: false, message: "تم شحن الكارت لكن لم يتم تحديد المبلغ - تواصل مع الإدارة" };
  }

  const exchangeRate = getAsiacellExchangeRate(admin);
  const creditedUsd = convertIqdToUsd(finalAmount, exchangeRate);
  if (!creditedUsd) return { success: false, error: "تعذر حساب قيمة الشحن بالدولار - تواصل مع الإدارة" };

  await creditUser(userId, creditedUsd, "asiacell", `شحن كرت آسياسيل بقيمة ${finalAmount} د.ع (سعر الصرف ${exchangeRate} د.ع/دولار)`, `card_${v.slice(-4)}_${Date.now()}`);
  if (session) await deleteCustomerSession(session.id);

  return { success: true, amountIQD: finalAmount, credited: creditedUsd, exchangeRate, message: `تم شحن الكرت بقيمة ${finalAmount.toLocaleString("ar-IQ")} د.ع وإضافة ${creditedUsd.toFixed(4)} دولار إلى رصيدك` };
}

export async function startTransfer(
  userId: number,
  sessionId: string,
  amountIQD: number,
  admin?: AdminSession | null
): Promise<{ success: boolean; amountIQD?: number; feeIQD?: number; totalIQD?: number; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session || !session.access_token) return { success: false, error: "الجلسة منتهية أو لم يتم التحقق" };

  const storePhone = admin?.store_phone || admin?.phone;
  if (!storePhone) return { success: false, error: "رقم المتجر غير مضبوط - تواصل مع الإدارة" };

  if (!amountIQD || amountIQD < 250) return { success: false, error: "الحد الأدنى للتحويل 250 د.ع" };

  const transferFeeIQD = ASIACELL_TRANSFER_FEE_IQD;
  const totalTransferIQD = amountIQD + transferFeeIQD;
  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/credit-transfer/start?lang=ar`,
    { method: "POST", body: JSON.stringify({ amount: totalTransferIQD, receiverMsisdn: storePhone }) },
    authHeaders(session.device_id, session.access_token)
  );

  if (!data) {
    debugAsiacell("Transfer start returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell - ربما الموقع يواجه ضغطاً. حاول مرة أخرى." };
  }

  if (!isSuccessResponse(data)) {
    return { success: false, message: extractAsiacellError(data) || "فشل بدء التحويل" };
  }

  const transferPid = stringField(data, "PID") || stringField(data, "pid");
  if (!transferPid) {
    return { success: false, message: stringField(data, "message") || stringField(data, "error") || "فشل بدء التحويل - لم يتم الحصول على PID" };
  }

  await updateCustomerSession(session.id, { transfer_pid: transferPid, amount: amountIQD, step: "awaiting_transfer_otp" });
  return {
    success: true,
    amountIQD,
    feeIQD: transferFeeIQD,
    totalIQD: totalTransferIQD,
    message: stringField(data, "message") || `تم بدء تحويل ${totalTransferIQD.toLocaleString("ar-IQ")} د.ع شامل رسم التحويل. أدخل رمز التأكيد الذي وصلك من آسيا سيل.`,
  };
}

export async function confirmTransfer(userId: number, sessionId: string, otp: string, admin?: AdminSession | null): Promise<{ success: boolean; credited?: number; amountIQD?: number; feeIQD?: number; totalIQD?: number; exchangeRate?: number; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session || !session.access_token || !session.transfer_pid) {
    return { success: false, error: "الجلسة منتهية أو لم يتم بدء التحويل" };
  }

  const o = String(otp || "").trim();
  if (!o) return { success: false, error: "رمز التأكيد مطلوب" };

  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: session.transfer_pid, passcode: o }) },
    authHeaders(session.device_id, session.access_token)
  );

  if (!data) {
    debugAsiacell("Transfer confirmation returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell - حاول مرة أخرى" };
  }

  if (!isSuccessResponse(data)) {
    return { success: false, message: extractAsiacellError(data) || "فشل تأكيد التحويل" };
  }

  const transferFeeIQD = ASIACELL_TRANSFER_FEE_IQD;
  const totalTransferIQD = session.amount + transferFeeIQD;
  const exchangeRate = getAsiacellExchangeRate(admin);
  const creditedUsd = convertIqdToUsd(session.amount, exchangeRate);
  if (!creditedUsd) return { success: false, error: "تعذر حساب قيمة التحويل بالدولار - تواصل مع الإدارة" };

  await creditUser(userId, creditedUsd, "asiacell", `تحويل آسياسيل: صافي ${session.amount} د.ع + رسم ${transferFeeIQD} د.ع = إجمالي ${totalTransferIQD} د.ع (سعر الصرف ${exchangeRate} د.ع/دولار)`, `transfer_${session.phone}_${Date.now()}`);
  await deleteCustomerSession(session.id);

  return {
    success: true,
    credited: creditedUsd,
    amountIQD: session.amount,
    feeIQD: transferFeeIQD,
    totalIQD: totalTransferIQD,
    exchangeRate,
    message: `تم التحويل بقيمة ${session.amount.toLocaleString("ar-IQ")} د.ع. الرسم ${transferFeeIQD.toLocaleString("ar-IQ")} د.ع، والإجمالي المدفوع ${totalTransferIQD.toLocaleString("ar-IQ")} د.ع. تمت إضافة ${creditedUsd.toFixed(4)} دولار إلى رصيدك.`,
  };
}

export async function resendTransferOtp(sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await getCustomerSession(sessionId);
  if (!session || !session.access_token || !session.transfer_pid) {
    return { success: false, error: "الجلسة منتهية أو لم يتم بدء التحويل" };
  }

  const { json: data } = await retryAsiacellFetch(
    `${AC_API}/api/v1/credit-transfer/do-transfer?lang=ar`,
    { method: "POST", body: JSON.stringify({ PID: session.transfer_pid, passcode: "" }) },
    authHeaders(session.device_id, session.access_token)
  );

  if (!data) {
    debugAsiacell("Resend returned non-JSON response");
    return { success: false, error: "رد غير متوقع من Asiacell" };
  }
  return { success: true, message: stringField(data, "message") || "تم إعادة إرسال الرمز" };
}

// ========== RECORDS POLLING ==========

const processedTransfers = new Set<string>();

export async function checkRecordsAndCredit(): Promise<{ checked: boolean; processed?: number; total?: number; reason?: string; error?: string }> {
  const admin = await getAdminRow();
  if (!admin?.authenticated || !admin.access_token) {
    return { checked: false, reason: "Admin not authenticated" };
  }

  try {
    const { json: data } = await retryAsiacellFetch(
      `${AC_API}/api/v1/cdr/detail?type=sms&page=1&limit=50&lang=ar&theme=avocado`,
      { method: "GET" },
      authHeaders(admin.device_id, admin.access_token)
    );

    if (!data) {
      debugAsiacell("Records returned non-JSON response");
      return { checked: false, error: "Non-JSON response" };
    }

        const records = Array.isArray(data.data) ? data.data.filter(isJsonRecord) : [];
    if (records.length === 0) {
      if (Number(data.status) === 401 || stringField(data, "message").toLowerCase().includes("unauthorized")) {
        await setAdminRow({ authenticated: 0 });
      }
      return { checked: true, processed: 0, error: "No records data" };
    }
    let processed = 0;
    for (const record of records) {
      const recordId = String(record.id || record.transactionId || `${record.date}_${record.otherParty}`);
      if (processedTransfers.has(recordId)) continue;
      const msg = String(record.message || record.description || record.text || "");
      const sender = String(record.otherParty || record.from || record.number || "");
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
            const user = result.rows[0] as JsonRecord;
            const exchangeRate = getAsiacellExchangeRate(admin);
            const creditedUsd = convertIqdToUsd(amount, exchangeRate);
            if (creditedUsd > 0) {
              await creditUser(Number(user.id), creditedUsd, "asiacell", `تحويل وارد من ${sender} بقيمة ${amount} د.ع (سعر الصرف ${exchangeRate} د.ع/دولار)`, recordId);
            }
            processed++;
          }
        }
      }
      processedTransfers.add(recordId);
    }

    return { checked: true, processed, total: records.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
    console.error("[Asiacell Records] Error:", message);
    return { checked: false, error: message };
  }
}
