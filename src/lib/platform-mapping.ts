export const platformKeywords: Record<string, string[]> = {
  instagram: ["instagram", "انستغرام", "انستقرام", "insta"],
  tiktok: ["tiktok", "تيك توك", "ticktok", "tic tok"],
  facebook: ["facebook", "فيسبوك", "fb"],
  youtube: ["youtube", "يوتيوب", "يوتوب", "yt"],
  twitter: ["twitter", "تويتر", "x / twitter", "x/twitter"],
  telegram: ["telegram", "تيليجرام", "تلجرام"],
  whatsapp: ["whatsapp", "واتساب", "واتس"],
  snapchat: ["snapchat", "سناب جات", "سناب"],
  discord: ["discord", "ديسكورد"],
  twitch: ["twitch", "تويتش"],
  spotify: ["spotify", "سبوتيفاي"],
  threads: ["threads", "ثريدز"],
  kuaishou: ["kuaishou", "كواي"],
  likee: ["likee", "كيك"],
};

export function detectPlatform(category: string, serviceName: string): string {
  const text = `${category} ${serviceName}`.toLowerCase();
  for (const [platform, keywords] of Object.entries(platformKeywords)) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return platform;
    }
  }
  return "other";
}

export const serviceTypes: Record<string, string[]> = {
  followers: ["متابعين", "followers", "subscriber", "subscribers", "أعضاء", "members"],
  likes: ["لايكات", "likes", "إعجابات", "اعجابات"],
  views: ["مشاهدات", "views", "watch", "watches"],
  comments: ["تعليقات", "comments", "comment"],
  shares: ["مشاركات", "shares", "share", "ريبوست", "repost"],
  saves: ["حفظ", "saves", "save"],
  votes: ["تصويت", "votes", "poll"],
  stories: ["ستوري", "stories", "story"],
  reels: ["ريلز", "reels", "reel"],
  live: ["بث", "live", "بث مباشر"],
};

export function detectServiceType(name: string): string {
  const text = name.toLowerCase();
  for (const [type, keywords] of Object.entries(serviceTypes)) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return type;
    }
  }
  return "other";
}
