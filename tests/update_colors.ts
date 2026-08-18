import { createClient } from "@libsql/client";
async function main() {
  const db = createClient({ url: `file:${process.env.LOCAL_DB_PATH || "/tmp/follower-local.db"}` });
  await db.execute(`UPDATE site_settings SET
    siteName='Follower',
    primaryColor='#d4af37',
    backgroundColor='#0d0906',
    cardColor='#1c1710',
    surfaceColor='#20180c',
    borderColor='#3d3018',
    secondaryColor='#ffd700',
    primaryLight='#f0d27a',
    updated_at=datetime('now')
    WHERE id='default'`);
  const row = await db.execute("SELECT primaryColor, primaryLight, secondaryColor, backgroundColor, cardColor, surfaceColor, borderColor FROM site_settings WHERE id='default'");
  console.log(JSON.stringify(row.rows, null, 2));
}
main().catch(console.error);
