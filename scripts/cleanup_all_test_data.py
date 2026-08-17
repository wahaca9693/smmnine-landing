"""تنظيف شامل لبيانات الاختبار بعد التصور النهائي (قبل رفع التغييرات)."""
import sqlite3

DB = "/tmp/follower-local.db"
db = sqlite3.connect(DB)

# الخدمات المرتبطة بالمزودين التجريبيين 5 و 6
db.execute("DELETE FROM provider_services WHERE provider_id IN (5, 6)")
print("services deleted:", db.total_changes)

# المزودون التجريبيون
db.execute("DELETE FROM providers WHERE id IN (5, 6)")
print("providers deleted:", db.total_changes)

# حساب الأدمن المؤقت وحساب اختبار QA (لكن qatest2026 قد يكون من اختبار API سابق — نحذفه أيضًا لأنه اختبار)
db.execute("DELETE FROM users WHERE username IN ('adminshot', 'qatest2026')")
print("users deleted:", db.total_changes)

db.commit()
print("providers:", db.execute("SELECT id, name FROM providers").fetchall())
print("services:", db.execute("SELECT COUNT(*) FROM provider_services").fetchone())
print("users:", db.execute("SELECT id, username FROM users").fetchall())
