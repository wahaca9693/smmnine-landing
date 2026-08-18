import { db, initDb } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function seed() {
  await initDb();

  const adminSeedPassword = process.env.SEED_ADMIN_PASSWORD;
  const userSeedPassword = process.env.SEED_USER_PASSWORD;
  if (!adminSeedPassword || !userSeedPassword) {
    throw new Error("SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD must be set outside Git");
  }

  const adminPassword = await bcrypt.hash(adminSeedPassword, 10);
  const userPassword = await bcrypt.hash(userSeedPassword, 10);

  try {
    await db.execute({
      sql: "INSERT OR IGNORE INTO users (username, email, password_hash, balance, role, terms_accepted) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["admin", "admin@follower.com", adminPassword, 1000, "admin", 1],
    });
    await db.execute({
      sql: "INSERT OR IGNORE INTO users (username, email, password_hash, balance, role, terms_accepted) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["koooookook1", "user@follower.com", userPassword, 1.1727, "user", 1],
    });
  } catch (e) {
    console.error(e);
  }

  const methods = [
    { name: "USDT BEP20 (Binance Smart Chain)", name_en: "USDT BEP20", icon: "dollar", instructions: "أرسل USDT على شبكة BEP20 إلى محفظتك" },
    { name: "USDT (PLASMA)", name_en: "USDT PLASMA", icon: "bolt", instructions: "تحقق تلقائي من الإيداع" },
    { name: "Binance Pay (Order ID)", name_en: "Binance Pay", icon: "wallet", instructions: "USDT • Binance Pay" },
    { name: "TON", name_en: "TON", icon: "diamond", instructions: "مراجعة يدوية • TON" },
    { name: "Litecoin", name_en: "Litecoin", icon: "coin", instructions: "مراجعة يدوية • LTC" },
    { name: "USDT TRC20 (Tron)", name_en: "USDT TRC20", icon: "bolt", instructions: "تحقق تلقائي • USDT" },
    { name: "نجوم تيليجرام", name_en: "Telegram Stars", icon: "star", instructions: "Telegram Stars تحقق تلقائي داخل البوت" },
    { name: "زين العراق (كرت / تحويل)", name_en: "Zain Iraq", icon: "signal", instructions: "كرت أو تحويل • 1000 د.ع = $0.60" },
    { name: "اسياسيل (كرت و تحويل)", name_en: "Asiacell", icon: "phone", instructions: "Asiacell • min: 0.00000 IQD" },
  ];

  for (const m of methods) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO payment_methods (name, name_en, icon, instructions) VALUES (?, ?, ?, ?)",
      args: [m.name, m.name_en, m.icon, m.instructions],
    });
  }

  console.log("Seeded successfully");
}

seed().catch(console.error);
