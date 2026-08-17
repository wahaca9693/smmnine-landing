"""Insert a temporary design-test provider + 2 services, returns their ids for cleanup."""
import sqlite3, sys

DB = "/tmp/follower-local.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

c.execute(
    "INSERT INTO providers (name, api_url, api_key, is_active, created_at) "
    "VALUES ('مزود اختبار التصميم', 'https://test-provider.com/api/v2', 'test-key-design', 1, datetime('now'))"
)
pid = c.lastrowid
cols = [row[1] for row in c.execute("PRAGMA table_info(provider_services)")]
print("provider_services columns:", cols)

active = 1 if "1" in sys.argv else 0
c.execute(
    "INSERT INTO provider_services "
    "(provider_id, remote_service_id, category, name, rate, min, max, markup_percent, sell_rate, is_active, created_at) "
    "VALUES (?,?,?,?,?,?,?,?,?,1,datetime('now'))",
    (pid, 1, "Instagram", "متابعين انستقرام - جودة عالية", 0.35, 100, 1000000, 30, 0.50),
)
c.execute(
    "INSERT INTO provider_services "
    "(provider_id, remote_service_id, category, name, rate, min, max, markup_percent, sell_rate, is_active, created_at) "
    "VALUES (?,?,?,?,?,?,?,?,?,1,datetime('now'))",
    (pid, 2, "YouTube", "مشاهدات فيديو يوتيوب", 0.20, 500, 5000000, 25, 0.25),
)
conn.commit()
print("pid:", pid)
conn.close()
