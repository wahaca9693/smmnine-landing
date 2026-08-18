// شحن رصيد تجريبي للحساب التجريبي — للعرض فقط
import { createClient } from "@libsql/client";
async function main() {
  const db = createClient({ url: "file:/home/ubuntu/smmnine-data/local.db" });
  await db.execute("UPDATE users SET balance = 49.88 WHERE username = 'demo_user'");
  const rows = await db.execute("SELECT username, balance FROM users WHERE username = 'demo_user'");
  console.log(JSON.stringify(rows.rows, null, 2));
  await db.close();
}
main().catch(console.error);
