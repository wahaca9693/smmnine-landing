import { initDb } from "../src/lib/db";

async function migrate() {
  await initDb();
  console.log("Migration complete");
}

migrate().catch(console.error);
