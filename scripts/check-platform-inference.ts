import fs from "node:fs";
import { createClient } from "@libsql/client";
import { detectPlatform, platformDisplayName } from "../src/lib/platform-mapping";

function loadEnv(path: string) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  loadEnv(".env.local");
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Turso environment is not configured");
  const db = createClient({ url, authToken });
  const result = await db.execute(`SELECT ps.name, ps.category FROM provider_services ps JOIN providers p ON p.id = ps.provider_id WHERE p.is_active = 1 AND ps.is_active = 1`);
  const counts = new Map<string, number>();
  const examples = new Map<string, string>();
  for (const row of result.rows) {
    const category = String(row.category ?? "");
    const name = String(row.name ?? "");
    const platform = detectPlatform(category, name);
    counts.set(platform, (counts.get(platform) ?? 0) + 1);
    if (!examples.has(platform)) examples.set(platform, `${category} | ${name}`);
  }
  console.log(JSON.stringify({
    activeRows: result.rows.length,
    platforms: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, name: platformDisplayName(id), count, example: examples.get(id) })),
  }, null, 2));
  db.close();
}

void main();
