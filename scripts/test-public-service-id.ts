import fs from "node:fs";

function loadEnv(path: string) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

type Row = Record<string, unknown>;

async function main() {
  loadEnv(".env.local");
  const { db } = await import("../src/lib/db");
  const { findCatalogServiceByPublicId, getPublicProviderServiceId } = await import("../src/lib/service-catalog");

  const result = await db.execute(`
    SELECT ps.provider_id, ps.service
    FROM provider_services ps
    JOIN providers p ON p.id = ps.provider_id
    WHERE p.is_active = 1 AND ps.is_active = 1
    LIMIT 1
  `);
  const provider = result.rows[0] as unknown as Row | undefined;
  if (!provider) throw new Error("No active provider service available for round-trip test");

  const publicId = getPublicProviderServiceId(Number(provider.provider_id), String(provider.service));
  const resolved = await findCatalogServiceByPublicId(publicId);
  if (!resolved || resolved.source !== "provider") {
    throw new Error(`Unable to resolve public service id ${publicId}`);
  }
  if (resolved.remoteServiceId !== String(provider.service)) {
    throw new Error("Resolved remote service id does not match source service");
  }

  console.log(JSON.stringify({ publicId, source: resolved.source, resolved: true }));
  db.close();
}

void main();
