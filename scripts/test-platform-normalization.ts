import { detectPlatform, normalizePlatformId } from "../src/lib/platform-mapping";

const cases = [
  ["telegram-cheapest", "telegram"],
  ["dribble-server", "dribbble"],
  ["linkedin-usa", "linkedin"],
  ["soundcloud-germany", "soundcloud"],
  ["kwai-targeted", "kuaishou"],
  ["apple-music", "apple-music"],
  ["exchange-platforms", "exchange-platforms"],
] as const;

for (const [input, expected] of cases) {
  const actual = normalizePlatformId(input);
  if (actual !== expected) {
    throw new Error(`${input}: expected ${expected}, got ${actual}`);
  }
}

const detected = [
  ["Telegram Cheapest Services", "", "telegram"],
  ["Dribble Server", "", "dribbble"],
  ["LinkedIn USA", "", "linkedin"],
] as const;

for (const [name, category, expected] of detected) {
  const actual = detectPlatform(category, name);
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`);
  }
}

console.log(`platform normalization passed (${cases.length + detected.length} cases)`);
