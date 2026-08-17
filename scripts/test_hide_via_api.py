"""Verify hide/show works via real API with admin session, and check preview refresh."""
import requests

BASE = "http://localhost:3000"

s = requests.Session()
r = s.post(BASE + "/api/auth/login", json={"username": "adminshot", "password": "shotpass99"})
print("login:", r.status_code, r.text[:120])

# جلب id الخدمة الأولى
r = s.get(BASE + "/api/admin/providers?mode=services")
svcs = r.json().get("services", [])
print("services:", len(svcs))
for x in svcs:
    print(" svc", x.get("id"), "| provider", x.get("provider_id"), "| name", x.get("name"), "| active", x.get("is_active"))

if svcs:
    sid = svcs[0]["id"]
    # إخفاء
    r = s.post(BASE + "/api/admin/providers", json={"action": "update-service", "id": sid, "is_active": 0})
    print("hide:", r.status_code, r.text[:100])
    r = s.get(BASE + "/api/admin/providers?mode=services")
    print("after hide:", [x["is_active"] for x in r.json()["services"] if x["id"] == sid])
    # إظهار
    r = s.post(BASE + "/api/admin/providers", json={"action": "update-service", "id": sid, "is_active": 1})
    print("show:", r.status_code, r.text[:100])
    r = s.get(BASE + "/api/admin/providers?mode=services")
    print("after show:", [x["is_active"] for x in r.json()["services"] if x["id"] == sid])
