import { createClient } from "@libsql/client";
async function main() {
const db = createClient({ url: `file:${process.env.LOCAL_DB_PATH || "/tmp/follower-local.db"}` });
const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log("TABLES:", tables.rows.map((t: any) => t.name).join(", "));
for (const t of tables.rows as any[]) {
  if (t.name.toLowerCase().includes("setting")) {
    const cols = await db.execute(`PRAGMA table_info(${t.name})`);
    console.log(`=== ${t.name} cols:`, cols.rows.map((c: any) => c.name).join(", "));
    const rows = await db.execute(`SELECT * FROM ${t.name}`);
    for (const r of rows.rows as any[]) {
      const vals = Object.entries(r).map(([k, v]) => `${k}=${String(v).slice(0, 45)}`).join(" | ");
      console.log("ROW:", vals);
    }
  }
}
}
main().catch(console.error);
