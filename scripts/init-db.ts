import fs from "node:fs";
import path from "node:path";

function loadLocalEnvironment() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

loadLocalEnvironment();

async function main() {
  const { initDb } = await import("../src/lib/db");
  await initDb();
  console.log("Database initialized");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
