import { db } from "../src/lib/db";

async function clear() {
  await db.execute("DELETE FROM payment_methods");
  console.log("All payment methods removed");
}

clear().catch(console.error);
