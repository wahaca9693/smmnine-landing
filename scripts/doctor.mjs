#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { createClient } from "@libsql/client";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = { ...loadEnvFile(".env.local"), ...loadEnvFile(".env"), ...process.env };
const failures = [];
const warnings = [];

const majorNode = Number(process.versions.node.split(".")[0]);
if (!Number.isFinite(majorNode) || majorNode < 20) {
  failures.push(`Node.js 20 أو أحدث مطلوب، والإصدار الحالي ${process.versions.node}.`);
}

const localMode = env.USE_LOCAL_DB === "1" && env.NODE_ENV !== "production";
if (!localMode) {
  if (!env.TURSO_DATABASE_URL) failures.push("TURSO_DATABASE_URL غير موجود.");
  if (!env.TURSO_AUTH_TOKEN) failures.push("TURSO_AUTH_TOKEN غير موجود.");
  if (env.TURSO_DATABASE_URL && !/^(libsql|https?):\/\//.test(env.TURSO_DATABASE_URL)) {
    failures.push("TURSO_DATABASE_URL يجب أن يبدأ بـ libsql:// أو https://.");
  }
  if (env.TURSO_AUTH_TOKEN && env.TURSO_AUTH_TOKEN.length < 20) {
    failures.push("TURSO_AUTH_TOKEN قصير أو غير صالح ظاهريًا.");
  }
} else if (!env.LOCAL_DB_PATH) {
  warnings.push("وضع قاعدة البيانات المحلية مفعّل، لكن LOCAL_DB_PATH غير محدد؛ سيتم استخدام المسار الافتراضي للمشروع إن دعمته طبقة قاعدة البيانات.");
}

if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
  failures.push("SESSION_SECRET غير موجود أو أقصر من 32 محرفًا.");
}

if (!env.NOWPAYMENTS_API_KEY || !env.NOWPAYMENTS_IPN_SECRET) {
  warnings.push("NOWPayments غير مفعّل في البيئة الحالية؛ الشحن الآلي الحقيقي لا يُعتبر جاهزًا حتى تُضاف مفاتيح جديدة وIPN webhook صحيح.");
}

if (failures.length === 0 && !localMode) {
  try {
    const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
    await client.execute("SELECT 1 AS ok");
    console.log("[doctor] Turso: متصل");
  } catch (error) {
    failures.push(`تعذر الاتصال بقاعدة Turso: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
  }
}

console.log(`[doctor] Node.js: ${process.versions.node}`);
console.log(`[doctor] database mode: ${localMode ? "local development" : "Turso"}`);
for (const warning of warnings) console.warn(`[doctor] تحذير: ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`[doctor] فشل: ${failure}`);
  process.exit(1);
}

console.log("[doctor] البيئة الأساسية جاهزة للتثبيت أو البناء.");
