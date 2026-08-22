import { translateServiceName } from "../src/lib/service-translation.ts";

const cases = [
  "Instagram Followers | Real | Speed: Up To 50K/Day | AUTO-Refill every HOUR for 30 days | Small Drops | MAX 100K",
  "Telegram MIX Bot Start for [EUROPE 🇪🇺] [Search Ranking]",
  "Telegram Bot Activity For (ID: 𝟮𝟴𝟵𝟲𝟴) (EUROPE 🇪🇺)",
  "Instagram Likes [FROM APP] [Refill: No] [Max: 100K] [Start Time: 0 - 1 Hour] [Speed: Up to 5K/Day]",
  "IG Auto likes [OLD AND FUTURE POST]",
  "Instagram Comments [RANDOM POST RELATED] [Max: 20K] [Start Time: 0 - 1 Hr] [Speed: 2K/D]",
  "🇳🇬 Instagram Custom Comments VOTES [NIGERIA & GHANA] [Max: 500]",
  "TG ai Members [🇺🇸 USA] + 14 Days Auto Future Post View From Follower",
  "Instagram Real Followers 1K-10K https://example.com/a?x=1 #vip @provider NFT V2",
];

for (const source of cases) {
  const translated = translateServiceName(source);
  const numbers = source.match(/\d[\d.,+%\/:xXKMkmbB-]*/g) ?? [];
  const preservedNumbers = numbers.every((number) => translated.includes(number));
  const preservedUrl = !source.includes("https://") || translated.includes("https://example.com/a?x=1");
  console.log(JSON.stringify({ source, translated, preservedNumbers, preservedUrl }));
}
