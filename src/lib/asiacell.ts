import { db } from "./db";
import { randomUUID, randomBytes } from "crypto";

export const AC_API = "https://odpapp.asiacell.com";

export function randomApiKey() {
  return randomBytes(16).toString("hex"); // 32 hex chars
}

// Headers matching the working Express gateway (asiacell.js)
export function baseHeaders() {
  return {
    Host: "odpapp.asiacell.com",
    "X-Odp-Api-Key": randomApiKey(),
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

// General authenticated headers (login, verify, transfer, records, balance)
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

// Top-up authenticated headers: NO X-Odp-Api-Key (exactly like working Asia.py/asiacell.js)
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

export interface StoreSettings {
  phone: string;
  store_phone: string;
  exchange_rate: number;
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

export async function getStoreSettings(): Promise<StoreSettings> {
  const result = await db.execute("SELECT * FROM asiacell_admin WHERE id = 1");
  const row = (result.rows[0] || {}) as any;
  return {
    phone: row.phone || "",
    store_phone: row.store_phone || row.phone || "",
    exchange_rate: Number(row.exchange_rate || 1666),
  };
}

export async function setStoreSettings(data: Partial<StoreSettings>) {
  const existing = await db.execute("SELECT id FROM asiacell_admin WHERE id = 1");
  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO asiacell_admin (id, phone, store_phone, exchange_rate)
            VALUES (1, ?, ?, ?)`,
      args: [data.phone || "", data.store_phone || data.phone || "", data.exchange_rate ?? 1666],
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

export async function creditUser(userId: number, amountUSD: number, method: string, description: string, paymentId: string) {
  await db.execute({
    sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
    args: [amountUSD, userId],
  });
  await db.execute({
    sql: `INSERT INTO transactions (user_id, type, amount, status, description, method)
          VALUES (?, 'deposit', ?, 'completed', ?, ?)`,
    args: [userId, amountUSD, description, method],
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

export function iqdToUsd(iqd: number, rate: number) {
  return Math.floor((iqd / rate) * 100) / 100;
}

export async function setUserVerifiedPhone(userId: number, phone: string) {
  await db.execute({
    sql: "UPDATE users SET verified_phone = ? WHERE id = ?",
    args: [cleanPhone(phone), userId],
  });
}
