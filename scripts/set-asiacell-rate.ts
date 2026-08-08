import { db } from "../src/lib/db";

async function main() {
  await db.execute("UPDATE asiacell_admin SET exchange_rate = 1666");
  console.log("Asiacell exchange rate set to 1666");
}

main().catch(console.error);
