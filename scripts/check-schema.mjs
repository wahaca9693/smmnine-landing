import { db, initDb } from "../src/lib/db.ts";

try {
  await initDb();
  const result = await db.execute({ sql: "PRAGMA table_info(provider_services)" });
  console.log(JSON.stringify(result.rows, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}

process.exit(0);

/* This file is temporary and should be removed after diagnosis. */
