import { db } from "../src/lib/db";

type SqlRow = Record<string, unknown>;

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const result = await db.execute({
      sql: `PRAGMA table_info(${table})`,
      args: [],
    });
    return (result.rows as unknown as SqlRow[]).some((row) => String(row.name ?? "") === column);
  } catch {
    return false;
  }
}

async function migrate() {
  // Ensure tickets table has correct columns
  const hasTickets = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'"
  );

  if (hasTickets.rows.length === 0) {
    console.log("Creating tickets table...");
    await db.execute(`
      CREATE TABLE tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        order_id TEXT,
        status TEXT DEFAULT 'open',
        admin_reply TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  } else {
    const columns = ["user_id", "type", "subject", "description", "order_id", "status", "admin_reply", "updated_at"];
    for (const col of columns) {
      if (!(await columnExists("tickets", col))) {
        console.log(`Adding column ${col} to tickets...`);
        let type = "TEXT";
        if (col === "user_id") type = "INTEGER";
        if (col === "updated_at") type = "DATETIME DEFAULT CURRENT_TIMESTAMP";
        await db.execute(`ALTER TABLE tickets ADD COLUMN ${col} ${type}`);
      }
    }
  }

  // Ensure ticket_replies table has correct columns
  const hasReplies = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ticket_replies'"
  );

  if (hasReplies.rows.length === 0) {
    console.log("Creating ticket_replies table...");
    await db.execute(`
      CREATE TABLE ticket_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER,
        is_admin INTEGER DEFAULT 0,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  console.log("Tickets migration completed");
}

migrate().catch(console.error);
