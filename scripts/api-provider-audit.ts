import { db } from "@/lib/db";

type Row = Record<string, unknown>;

async function main(): Promise<void> {
  const providers = await db.execute({
    sql: `SELECT id, name, is_active, connection_status, last_probe_at, last_error,
                 (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id) AS total_services,
                 (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id AND ps.is_active = 1) AS active_services
          FROM providers p ORDER BY id`,
  });
  const duplicates = await db.execute({
    sql: `SELECT provider_id, remote_service_id, COUNT(*) AS copies
          FROM provider_services GROUP BY provider_id, remote_service_id HAVING COUNT(*) > 1`,
  });
  const totals = await db.execute({
    sql: `SELECT COUNT(*) AS total,
                 SUM(CASE WHEN ps.is_active = 1 THEN 1 ELSE 0 END) AS active,
                 SUM(CASE WHEN ps.is_active = 1 AND p.is_active = 1 THEN 1 ELSE 0 END) AS reachable_active
          FROM provider_services ps JOIN providers p ON p.id = ps.provider_id`,
  });
  const serviceTotal = totals.rows[0] as unknown as Row | undefined;
  console.log(`PROVIDERS=${providers.rows.length}`);
  for (const raw of providers.rows as unknown as Row[]) {
    console.log(JSON.stringify({
      id: Number(raw.id),
      name: String(raw.name || ""),
      is_active: Number(raw.is_active),
      connection_status: raw.connection_status == null ? null : String(raw.connection_status),
      last_probe_at: raw.last_probe_at == null ? null : String(raw.last_probe_at),
      has_error: Boolean(raw.last_error),
      total_services: Number(raw.total_services || 0),
      active_services: Number(raw.active_services || 0),
    }));
  }
  console.log(`SERVICE_TOTAL=${Number(serviceTotal?.total || 0)} ACTIVE=${Number(serviceTotal?.active || 0)} ACTIVE_PROVIDER=${Number(serviceTotal?.reachable_active || 0)}`);
  console.log(`DUPLICATE_PROVIDER_SERVICES=${duplicates.rows.length}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Provider audit failed");
  process.exitCode = 1;
});
