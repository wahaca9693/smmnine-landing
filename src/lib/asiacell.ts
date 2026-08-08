import { db } from "./db";
import { randomUUID, randomBytes } from "crypto";

export const AC_API = "https://odpapp.asiacell.com";

export function randomApiKey() {
  return randomBytes(16).toString("hex"); // 32 hex chars
}

// Fixed API key from the working gateway
const AC_API_KEY = "1ccbc4c913bc4ce785a0a2de444aa0d6";

// Base headers matching the 100% working gateway (asia.txt)
export function baseHeaders() {
  return {
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
}

// General authenticated headers
export function getHeaders(deviceId: string, accessToken?: string | null) {
  const headers: Record<string, string> = {
    ...baseHeaders(),
    Deviceid: deviceId,
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    headers["X-Screen-Type"] = "MOBILE";
  }
  return headers;
}

// Top-up authenticated headers: NO X-Odp-Api-Key (exactly like working gateway)
export function getTopupHeaders(deviceId: string, accessToken: string) {
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

export function cleanPhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

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

export async function setAdminRow(data: Partial<AdminSession>) {
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
  return {
    ...row,
    user_id: Number(row.user_id),
    amount: Number(row.amount),
  } as CustomerSession;
}

export async function updateCustomerSession(id: string, data: Partial<CustomerSession>) {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.execute({
    sql: `UPDATE asiacell_sessions SET ${fields.join(", ")} WHERE id = ?`,
    args: values,
  });
}

export async function deleteCustomerSession(id: string) {
  await db.execute({ sql: "DELETE FROM asiacell_sessions WHERE id = ?", args: [id] });
}

export async function creditUser(userId: number, amount: number, method: string, description: string, paymentId: string) {
  await db.execute({
    sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
    args: [amount, userId],
  });
  await db.execute({
    sql: `INSERT INTO transactions (user_id, type, amount, status, description, method)
          VALUES (?, 'deposit', ?, 'completed', ?, ?)`,
    args: [userId, amount, description, method],
  });
}

export function extractTopupAmount(data: any): number {
  if (data?.analyticData?.params?.["Recharge Amount"]) {
    return Math.floor(parseFloat(String(data.analyticData.params["Recharge Amount"])));
  }
  if (data?.data?.amount) {
    return Math.floor(parseFloat(String(data.data.amount)));
  }
  if (data?.amount) {
    return Math.floor(parseFloat(String(data.amount)));
  }
  return 0;
}

export function isSuccessResponse(data: any): boolean {
  if (!data) return false;
  if (data.success === true) return true;
  const msg = String(data.message || "").toLowerCase();
  if (msg.includes("نجاح") || msg.includes("تمت") || msg.includes("success")) return true;
  return false;
}

export async function setUserVerifiedPhone(userId: number, phone: string) {
  await db.execute({
    sql: "UPDATE users SET verified_phone = ? WHERE id = ?",
    args: [cleanPhone(phone), userId],
  });
}

// Processed transfer records to avoid double-crediting
const processedTransfers = new Set<string>();

export async function checkRecordsAndCredit() {
  const admin = await getAdminRow();
  if (!admin?.authenticated || !admin.access_token) {
    return { checked: false, reason: "Admin not authenticated" };
  }

  try {
    const headers = {
      ...baseHeaders(),
      Deviceid: admin.device_id,
      Authorization: `Bearer ${admin.access_token}`,
      "X-Screen-Type": "MOBILE",
    };

    const r = await fetch(`${AC_API}/api/v1/cdr/detail?type=sms&page=1&limit=50&lang=ar&theme=avocado`, { headers });
    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[Asiacell Records] Non-JSON:", text.slice(0, 200));
      return { checked: false, error: "Non-JSON response" };
    }

    console.log(`[Asiacell Records] Fetched ${Array.isArray(data?.data) ? data.data.length : 0} records`);

    if (!data?.data || !Array.isArray(data.data)) {
      if (data?.status === 401 || String(data?.message || "").toLowerCase().includes("unauthorized")) {
        await setAdminRow({ authenticated: 0 });
        console.log("[Asiacell Records] Token expired, admin needs to re-authenticate");
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
            console.log(`[Asiacell Records] Auto-credited ${amount} to ${user.username} from ${sender}`);
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
