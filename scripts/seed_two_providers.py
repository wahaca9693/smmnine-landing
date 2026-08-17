"""Seed two temp providers with 2 services each + admin account (bcrypt hash)."""
import sqlite3, subprocess, json

DB = "/tmp/follower-local.db"
db = sqlite3.connect(DB)
c = db.cursor()

# Providers (ids may vary; skip if exist)
c.execute("DELETE FROM provider_services WHERE provider_id IN (SELECT id FROM providers WHERE name LIKE 'مزود اختبار التصميم%')")
c.execute("DELETE FROM providers WHERE name LIKE 'مزود اختبار التصميم%'")
c.execute("INSERT INTO providers (name, api_url, api_key, notes, is_active) VALUES (?,?,?,?,'1')",
          ("مزود اختبار التصميم 1", "https://test-provider1.com/api/v2", "key1", "مزود تجريبي للتصوير"))
p1 = c.lastrowid
c.execute("INSERT INTO providers (name, api_url, api_key, notes, is_active) VALUES (?,?,?,?,'1')",
          ("مزود اختبار التصميم 2", "https://test-provider2.com/api/v2", "key2", "مزود تجريبي للتصوير"))
p2 = c.lastrowid

rows = [
    (p1, "1", "متابعين انستقرام - جودة عالية", "Instagram", 0.35, 100, 1000000, "followers", 30, 1, 1),
    (p1, "2", "مشاهدات فيديو يوتيوب", "YouTube", 0.2, 500, 5000000, "views", 25, 1, 1),
    (p2, "3", "تفاعلات تيك توك", "TikTok", 0.15, 200, 2000000, "likes", 20, 1, 1),
    (p2, "4", "مشتركين تليجرام", "Telegram", 0.4, 50, 500000, "members", 35, 1, 1),
]
for pr, rsid, name, cat, rate, mn, mx, typ, markup, active, newf in rows:
    c.execute("INSERT INTO provider_services (provider_id, remote_service_id, name, category, rate, min, max, type, markup_percent, sell_rate, is_active, is_new) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
              (pr, rsid, name, cat, rate, mn, mx, typ, markup, rate * (1 + markup/100), active, newf))

# Admin account with bcrypt hash
pw_hash = subprocess.run(["node", "-e", "require('bcryptjs').hash('shotpass99',10).then(h=>console.log(h))"], capture_output=True, text=True).stdout.strip()
c.execute("DELETE FROM users WHERE email='adminshot'")
c.execute("INSERT INTO users (username, email, password_hash, role, balance) VALUES (?,?,?,?,0)", ("adminshot", "adminshot", pw_hash, "admin"))
db.commit()
print("providers:", p1, p2, "| hash:", pw_hash[:30])
