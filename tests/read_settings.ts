import { createClient } from "@libsql/client";

type SqlRow = Record<string, unknown>;
async function main() {
const db = createClient({ url: `file:${process.env.LOCAL_DB_PATH || "/tmp/follower-local.db"}` });
const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
const tableRows = tables.rows as unknown as SqlRow[];
console.log("TABLES:", tableRows.map((t) => String(t.name ?? "")).join(", "));
for (const t of tableRows) {
  const tableName = String(t.name ?? "");
  if (tableName.toLowerCase().includes("setting")) {
    const cols = await db.execute(`PRAGMA table_info(${tableName})`);
    const columnRows = cols.rows as unknown as SqlRow[];
    console.log(`=== ${tableName} cols:`, columnRows.map((c) => String(c.name ?? "")).join(", "));
    const rows = await db.execute(`SELECT * FROM ${tableName}`);
    for (const r of rows.rows as unknown as SqlRow[]) {
      const vals = Object.entries(r).map(([k, v]) => `${k}=${String(v).slice(0, 45)}`).join(" | ");
      console.log("ROW:", vals);
    }
  }
}
}
main().catch(console.error);
