import { initDb } from "../src/lib/db";

initDb()
  .then(() => console.log("Database initialized"))
  .catch(console.error);
