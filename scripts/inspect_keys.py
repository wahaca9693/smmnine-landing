import sqlite3

db = sqlite3.connect("/tmp/follower-local.db")
cols = [c[1] for c in db.execute("PRAGMA table_info(api_keys)")]
print("api_keys cols:", cols)
for r in db.execute("SELECT * FROM api_keys"):
    print(r)
users = {id_: u for id_, u in db.execute("SELECT id, username, role, balance FROM users")}
print("users:", users)
