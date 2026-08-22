import {
  translateServiceName,
  translateServiceDescription,
} from "../src/lib/service-translation.ts";

const cases = [
  "Telegram reactions - [❤️] | 1000 Followers | Max 50000 | Fast delivery | Refill 30 days",
  "Instagram Real and Active Followers 1K-10K per day — https://example.com/a?x=1 #vip @provider",
  "Mix Negative Reactions + Free Views [𝗖𝗵𝗲𝗽𝗲𝘀𝘁]",
  "подписчики TikTok 1000-10000, быстро, гарантия 30 дней",
  "YouTube 粉丝 真实 快速 1000",
  "Instagram फ़ॉलोअर्स और लाइक्स 5000",
];

for (const value of cases) {
  console.log(JSON.stringify({
    source: value,
    nameAr: translateServiceName(value),
    descriptionAr: translateServiceDescription(value),
  }));
}
