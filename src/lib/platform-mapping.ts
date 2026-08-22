export type PlatformOption = {
  id: string;
  name: string;
  color: string;
  count?: number;
  nameAr?: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  logoUrl?: string | null;
  serviceIds?: string[];
};

const platformKeywords: Record<string, string[]> = {
  facebook: ["facebook", "فيسبوك", "fb"],
  tiktok: ["tiktok", "تيك توك", "ticktok", "tic tok"],
  instagram: ["instagram", "انستغرام", "انستقرام", "insta"],
  youtube: ["youtube", "يوتيوب", "يوتوب", "yt"],
  twitter: ["twitter", "تويتر", "x / twitter", "x/twitter"],
  telegram: ["telegram", "تيليجرام", "تلجرام"],
  whatsapp: ["whatsapp", "واتساب", "واتس"],
  snapchat: ["snapchat", "snap chat", "سناب شات", "سناب جات", "سناب"],
  discord: [  "discord", "ديسكورد"],
  twitch: ["twitch", "تويتش"],
  spotify: ["spotify", "سبوتيفاي"],
  dribbble: ["dribbble", "dribble", "دريبل"],
  threads: ["threads", "ثريدز"],
  kuaishou: ["kuaishou", "كواي"],
  likee: ["likee", "لايكي", "كيك"],
};

const platformNames: Record<string, string> = {
  facebook: "فيسبوك",
  tiktok: "تيك توك",
  instagram: "إنستغرام",
  whatsapp: "واتساب",
  twitter: "X / تويتر",
  youtube: "يوتيوب",
  telegram: "تيليجرام",
  discord: "ديسكورد",
  snapchat: "سناب شات",
  threads: "ثريدز",
  twitch: "تويتش",
  kuaishou: "كواي",
  likee: "لايكي",
  spotify: "سبوتيفاي",
  dribbble: "دريبل",
  other: "أخرى",
};

const platformEnglishNames: Record<string, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  twitter: "X / Twitter",
  youtube: "YouTube",
  telegram: "Telegram",
  discord: "Discord",
  snapchat: "Snapchat",
  threads: "Threads",
  twitch: "Twitch",
  kuaishou: "Kuaishou",
  likee: "Likee",
  spotify: "Spotify",
  dribbble: "Dribbble",
  other: "Other",
};

const platformColors: Record<string, string> = {
  facebook: "#1877F2",
  tiktok: "#000000",
  instagram: "#E4405F",
  whatsapp: "#25D366",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  telegram: "#229ED9",
  discord: "#5865F2",
  snapchat: "#FFFC00",
  threads: "#000000",
  twitch: "#9146FF",
  kuaishou: "#FF6600",
  likee: "#FF0050",
  spotify: "#1DB954",
  dribbble: "#EA4C89",
  other: "#6B7280",
};

const genericCategoryWords = new Set([
  "service", "services", "خدمات", "خدمة", "social", "media", "سوشيال", "ميديا",
  "default", "general", "عام", "other", "others", "اخرى", "أخرى", "premium", "standard",
]);

// These suffixes describe a route, region, speed, or marketing variant; they
// are not separate platforms and must not create extra catalog buttons.
const platformVariantSuffixes = new Set([
  "cheapest", "server", "usa", "fast", "hq", "premium", "bot", "targeted",
  "real", "germany", "india", "turkey", "uk", "group", "reposts", "streams",
  "stream", "chat", "com", "amp", "voom",
]);

const platformAliases: Record<string, string> = {
  x: "twitter",
  "x-twitter": "twitter",
  "twitter-x": "twitter",
  snap: "snapchat",
  "snap-chat": "snapchat",
  "snapchat-ghost": "snapchat",
  thread: "threads",
  "threads-app": "threads",
  "twitch-tv": "twitch",
  "kuaishou-app": "kuaishou",
  dribble: "dribbble",
  "dribble-server": "dribbble",
  "dribbble-server": "dribbble",
  kwai: "kuaishou",
  "kwai-50": "kuaishou",
  "kwai-amp": "kuaishou",
  "kwai-cheapest": "kuaishou",
  "kwai-targeted": "kuaishou",
};

const serviceTypeWords = new Set(
  Object.values({
    followers: ["followers", "follower", "متابعين", "متابع", "subscriber", "subscribers", "أعضاء", "members"],
    likes: ["likes", "like", "لايكات", "إعجابات", "اعجابات"],
    views: ["views", "view", "مشاهدات", "مشاهدة", "watch", "watches"],
    comments: ["comments", "comment", "تعليقات", "تعليق"],
    shares: ["shares", "share", "مشاركات", "مشاركة", "ريبوست", "repost"],
    saves: ["saves", "save", "حفظ"],
    votes: ["votes", "vote", "تصويت", "poll"],
    stories: ["stories", "story", "ستوري"],
    reels: ["reels", "reel", "ريلز"],
    live: ["live", "بث", "بث مباشر"],
  }).flat().map((word) => word.toLowerCase()),
);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .trim();
}

/** Converts a provider/category label into a stable, URL-safe catalog identifier. */
export function normalizePlatformId(value: string): string {
  const slug = normalizeText(value)
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return "other";

  const directAlias = platformAliases[slug];
  if (directAlias) return directAlias;

  const parts = slug.split("-");
  while (parts.length > 1 && platformVariantSuffixes.has(parts[parts.length - 1])) {
    parts.pop();
  }
  const base = parts.join("-") || "other";
  return platformAliases[base] || base;
}

function knownPlatformFromText(text: string): string | null {
  const normalized = normalizeText(text);
  for (const [platform, keywords] of Object.entries(platformKeywords)) {
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) return platform;
  }
  return null;
}

function inferPlatformFromCategory(category: string): string | null {
  const normalized = normalizeText(category);
  if (!normalized || genericCategoryWords.has(normalized)) return null;

  const tokens = normalized
    .split(/[\s|/_:,;()[\]{}-]+/)
    .map((token) => token.trim())
    .filter((token) => token && !genericCategoryWords.has(token) && !serviceTypeWords.has(token));

  if (tokens.length === 0) return null;
  const candidate = normalizePlatformId(tokens.slice(0, 2).join("-"));
  return candidate === "other" ? null : candidate;
}

export function detectPlatform(category: string, serviceName: string): string {
  const known = knownPlatformFromText(`${category} ${serviceName}`);
  if (known) return known;
  return inferPlatformFromCategory(category) || inferPlatformFromCategory(serviceName) || "other";
}

export function platformDisplayName(id: string): string {
  const normalizedId = normalizePlatformId(id);
  if (platformNames[normalizedId]) return platformNames[normalizedId];
  return normalizedId
    .split("-")
    .filter(Boolean)
    .map((part) => part.length > 1 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
    .join(" ") || platformNames.other;
}

export function platformEnglishDisplayName(id: string): string {
  const normalizedId = normalizePlatformId(id);
  return platformEnglishNames[normalizedId] || normalizedId;
}

export function platformColor(id: string): string {
  return platformColors[normalizePlatformId(id)] || "#6B7280";
}

export function platformOption(id: string, count?: number): PlatformOption {
  const normalizedId = normalizePlatformId(id);
  return {
    id: normalizedId,
    name: platformDisplayName(normalizedId),
    color: platformColor(normalizedId),
    ...(typeof count === "number" ? { count } : {}),
  };
}

export const defaultPlatformOptions: PlatformOption[] = [
  "facebook", "tiktok", "instagram", "whatsapp", "twitter", "youtube", "telegram",
  "discord", "snapchat", "threads", "twitch", "kuaishou", "likee", "spotify", "other",
].map((id) => platformOption(id));

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
  const text = normalizeText(name);
  for (const [type, keywords] of Object.entries(serviceTypes)) {
    if (keywords.some((keyword) => text.includes(normalizeText(keyword)))) return type;
  }
  return "other";
}
