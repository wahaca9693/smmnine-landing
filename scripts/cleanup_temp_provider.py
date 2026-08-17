"""Remove the temporary design-test provider (id=2) and its services."""
import sqlite3

DB = "/tmp/follower-local.db"
conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute("DELETE FROM provider_services WHERE provider_id = 2")
c.execute("DELETE FROM providers WHERE id = 2")
conn.commit()
print("cleaned:", c.rowcount)
conn.close()
