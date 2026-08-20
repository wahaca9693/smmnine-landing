// إنشاء مفتاح API تجريبي + طلب وهمي فقط بالـ SELECT للعرض — لا POST للخدمات أبداً
import { createClient } from "@libsql/client";
async function main() {
  const db = createClient({ url: "file:/home/ubuntu/smmnine-data/local.db" });
  // التحقق: هل يوجد مفتاح أصلاً لـ demo_user؟
  const existing = await db.execute("SELECT id FROM api_keys WHERE user_id = 4");
  if (existing.rows.length > 0) {
    console.log("Key already exists");
    await db.close();
    return;
  }
  const key = "smm-" + Array.from({ length: 48 }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("");
  await db.execute("INSERT INTO api_keys (user_id, api_key, name, is_active) VALUES (4, ?, 'مفتاحي الرئيسي', 1)", [key]);
  console.log("Created:", key);
  await db.close();
}
main().catch(console.error);
