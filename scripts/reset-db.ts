import { db } from "../src/lib/db";

async function reset() {
  await db.execute("DROP TABLE IF EXISTS notifications");
  await db.execute("DROP TABLE IF EXISTS transactions");
  await db.execute("DROP TABLE IF EXISTS orders");
  await db.execute("DROP TABLE IF EXISTS payment_methods");
  await db.execute("DROP TABLE IF EXISTS users");
  console.log("Dropped all tables");
}

reset().catch(console.error);
