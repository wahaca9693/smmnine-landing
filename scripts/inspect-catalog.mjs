import { createClient } from "@libsql/client";
import fs from "node:fs";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnv(".env.local");
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("Turso environment is not configured");
const client = createClient({ url, authToken });

const queries = {
  providers: "SELECT id, name, is_active, connection_status, last_error FROM providers ORDER BY id",
  counts: "SELECT p.id AS provider_id, p.name, p.is_active AS provider_active, COUNT(ps.id) AS total, SUM(CASE WHEN ps.is_active = 1 THEN 1 ELSE 0 END) AS active FROM providers p LEFT JOIN provider_services ps ON ps.provider_id = p.id GROUP BY p.id, p.name, p.is_active ORDER BY p.id",
  categories: "SELECT category, type, COUNT(*) AS count FROM provider_services ps JOIN providers p ON p.id = ps.provider_id WHERE p.is_active = 1 AND ps.is_active = 1 GROUP BY category, type ORDER BY count DESC LIMIT 40",
  samples: "SELECT ps.id, ps.provider_id, ps.remote_service_id, ps.name, ps.category, ps.type, ps.is_active, p.is_active AS provider_active FROM provider_services ps JOIN providers p ON p.id = ps.provider_id ORDER BY ps.id DESC LIMIT 12",
};

for (const [name, sql] of Object.entries(queries)) {
  const result = await client.execute(sql);
  console.log(`--- ${name} ---`);
  console.log(JSON.stringify(result.rows));
}
client.close();
