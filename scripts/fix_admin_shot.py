"""Ensure adminshot admin account exists with valid bcrypt hash and role=admin."""
import sqlite3, subprocess, json

DB = "/tmp/follower-local.db"
c = sqlite3.connect(DB).cursor()
res = subprocess.run(
    ["node", "-e", 'require("bcryptjs").hash("shotpass99", 10).then(h => console.log(h))'],
    capture_output=True, text=True,
)
pw = res.stdout.strip()
# check existing row
row = c.execute("SELECT id, username, role, password_hash FROM users WHERE username='adminshot'").fetchone()
print("existing:", row)
if row:
    c.execute("UPDATE users SET password_hash=?, role='admin', is_banned=0 WHERE username='adminshot'", (pw,))
else:
    c.execute(
        "INSERT INTO users (username,email,password_hash,balance,role,terms_accepted,created_at,is_banned,status) "
        "VALUES ('adminshot','shot@example.com',?,0.0,'admin',1,datetime('now'),0,'active')", (pw,)
    )
c.connection.commit()
print("updated/created adminshot")
# verify hash matches
import bcrypt
ok = bcrypt.checkpw(b"shotpass99", c.execute("SELECT password_hash FROM users WHERE username='adminshot'").fetchone()[0].encode())
print("hash valid:", ok)
