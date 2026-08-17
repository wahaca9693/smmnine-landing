#!/usr/bin/env node

const baseUrl = process.env.APP_URL || "http://localhost:3000";
const endpoint = `${baseUrl.replace(/\/$/, "")}/api/health`;

try {
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[healthcheck] فشل HTTP ${response.status}: ${body.slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`[healthcheck] OK ${response.status}: ${body.slice(0, 300)}`);
} catch (error) {
  console.error(`[healthcheck] تعذر الوصول إلى ${endpoint}: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
  process.exit(1);
}
