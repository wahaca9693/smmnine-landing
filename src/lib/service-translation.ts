import { createHash } from "node:crypto";

export type ServiceTextKind = "name" | "description" | "category";

const ARABIC_RE = /[\u0600-\u06ff]/;
const LATIN_RE = /[A-Za-z]/;
const SOURCE_TOKEN_RE = /https?:\/\/[^\s]+|www\.[^\s]+|@[\w.-]+|#[\w-]+|(?:\d[\d.,+%:/xXKMkmbB-]*)/g;
const PLACEHOLDER = "__SMM_TOKEN_";

/**
 * قاموس محلي deterministic حتى لا تعتمد ترجمة الكتالوج على مزود مدفوع أو
 * استدعاء شبكة أثناء العرض. الترتيب الأطول أولًا يمنع تفكيك العبارات المركبة.
 */
const PHRASES: Array<[string, string]> = [
  ["lifetime guarantee", "ضمان مدى الحياة"],
  ["real and active followers", "متابعين حقيقيين ونشطين"],
  ["real and active subscribers", "مشتركين حقيقيين ونشطين"],
  ["free views", "مشاهدات مجانية"],
  ["free likes", "إعجابات مجانية"],
  ["telegram reactions", "تفاعلات تيليجرام"],
  ["instagram followers", "متابعين إنستغرام"],
  ["facebook followers", "متابعين فيسبوك"],
  ["tiktok followers", "متابعين تيك توك"],
  ["youtube views", "مشاهدات يوتيوب"],
  ["real organic users", "مستخدمون حقيقيون عضويون"],
  ["random post related", "عشوائية مرتبطة بالمنشور"],
  ["search ranking", "ترتيب الظهور في البحث"],
  ["bot activity", "نشاط البوت"],
  ["auto-refill", "إعادة تعبئة تلقائية"],
  ["small drops", "انخفاضات طفيفة"],
  ["up to", "حتى"],
  ["from app", "من التطبيق"],
  ["old and future post", "منشورات قديمة ومستقبلية"],
  ["custom comments votes", "تعليقات مخصصة وتصويتات"],
  ["auto future post views by ai", "مشاهدات مستقبلية تلقائية للمنشور بواسطة الذكاء الاصطناعي"],
  ["for channels", "للقنوات"],
  ["for channel/group/bot", "للقناة/المجموعة/البوت"],
  ["join from search", "انضمام من البحث"],
  ["just link", "الرابط فقط"],
  ["includes statistics", "يشمل الإحصاءات"],
  ["not guaranteed", "غير مضمون"],
  ["30 days refill", "إعادة تعبئة 30 يومًا"],
  ["lifetime guaranteed", "ضمان مدى الحياة"],
  ["auto refill", "إعادة تعبئة تلقائية"],
  ["no refill", "بدون إعادة تعبئة"],
  ["start time", "وقت البدء"],
  ["high quality", "جودة عالية"],
  ["real and active", "حقيقيون ونشطون"],
  ["real users", "مستخدمون حقيقيون"],
  ["real accounts", "حسابات حقيقية"],
  ["active accounts", "حسابات نشطة"],
  ["negative reactions", "تفاعلات سلبية"],
  ["positive reactions", "تفاعلات إيجابية"],
  ["mix negative reactions", "تفاعلات سلبية متنوعة"],
  ["mix", "متنوعة"],
  ["targeted audience", "جمهور مستهدف"],
  ["targeted views", "مشاهدات مستهدفة"],
  ["per day", "يوميًا"],
  ["days", "أيام"],
  ["day", "يوم"],
  ["with", "مع"],
  ["and", "و"],
  ["per 24 hours", "كل 24 ساعة"],
  ["fast delivery", "تسليم سريع"],
  ["instant delivery", "تسليم فوري"],
  ["drop protection", "حماية من النقص"],
  ["speed", "السرعة"],
  ["maximum", "الحد الأقصى"],
  ["max", "الحد الأقصى"],
  ["minimum", "الحد الأدنى"],
  ["min", "الحد الأدنى"],
  ["premium", "مميز"],
  ["free", "مجاني"],
  ["general", "عام"],
  ["accounts", "حسابات"],
  ["account", "حساب"],
  ["arabic", "عربية"],
  ["daily", "يومي"],
  ["hour", "ساعة"],
  ["hours", "ساعات"],
  ["package", "باقة"],
  ["telegram premium", "تيليجرام بريميوم"],
  ["instagram", "إنستغرام"],
  ["facebook", "فيسبوك"],
  ["tiktok", "تيك توك"],
  ["twitter", "تويتر"],
  ["youtube", "يوتيوب"],
  ["whatsapp", "واتساب"],
  ["telegram", "تيليجرام"],
  ["discord", "ديسكورد"],
  ["snapchat", "سناب شات"],
  ["threads", "ثريدز"],
  ["twitch", "تويتش"],
  ["europe", "أوروبا"],
  ["usa", "أمريكا"],
  ["italy", "إيطاليا"],
  ["nigeria", "نيجيريا"],
  ["india", "الهند"],
  ["ghana", "غانا"],
  ["uzbekistan", "أوزبكستان"],
  ["turkey", "تركيا"],
  ["china", "الصين"],
  ["russia", "روسيا"],
  ["spotify", "سبوتيفاي"],
  ["kuaishou", "كوايشو"],
  ["likee", "لايكي"],
  ["followers", "متابعين"],
  ["follower", "متابع"],
  ["subscribers", "مشتركين"],
  ["subscriber", "مشترك"],
  ["members", "أعضاء"],
  ["member", "عضو"],
  ["likes", "إعجابات"],
  ["like", "إعجاب"],
  ["views", "مشاهدات"],
  ["view", "مشاهدة"],
  ["comments", "تعليقات"],
  ["comment", "تعليق"],
  ["shares", "مشاركات"],
  ["share", "مشاركة"],
  ["saves", "حفظ"],
  ["save", "حفظ"],
  ["votes", "تصويتات"],
  ["vote", "تصويت"],
  ["stories", "قصص"],
  ["story", "قصة"],
  ["reels", "ريلز"],
  ["reel", "ريل"],
  ["live stream", "بث مباشر"],
  ["live", "مباشر"],
  ["targeted", "مستهدف"],
  ["organic", "عضوي"],
  ["real", "حقيقي"],
  ["users", "مستخدمون"],
  ["for", "لـ"],
  ["channels", "قنوات"],
  ["channel", "قناة"],
  ["group", "مجموعة"],
  ["bot", "بوت"],
  ["auto", "تلقائي"],
  ["future", "مستقبلي"],
  ["post", "منشور"],
  ["comments", "تعليقات"],
  ["reactions", "تفاعلات"],
  ["reaction", "تفاعل"],
  ["from", "من"],
  ["search", "البحث"],
  ["link", "رابط"],
  ["includes", "يشمل"],
  ["statistics", "الإحصاءات"],
  ["subscribes", "اشتراكات"],
  ["subscribe", "اشتراك"],
  ["blocked", "محظورة"],
  ["illegal", "غير قانونية"],
  ["start", "بدء"],
  ["id", "معرّف"],
  ["not", "غير"],
  ["no", "لا يوجد"],
  ["every", "كل"],
  ["subscription", "اشتراك"],
  ["activity", "نشاط"],
  ["ranking", "الترتيب"],
  ["random", "عشوائي"],
  ["related", "مرتبط"],
  ["custom", "مخصص"],
  ["votes", "تصويتات"],
  ["old", "قديم"],
  ["by", "بواسطة"],
  ["device", "جهاز"],
  ["app", "تطبيق"],
  ["tg", "تيليجرام"],
  ["ai", "الذكاء الاصطناعي"],
  ["new", "جديد"],
  ["refill", "إعادة تعبئة"],
  ["guaranteed", "مضمون"],
  ["guarantee", "ضمان"],
  ["instant", "فوري"],
  ["fast", "سريع"],
  ["cheap", "اقتصادي"],
  ["cheapest", "الأرخص"],
  ["chepest", "الأرخص"],
  ["new server", "سيرفر جديد"],
  ["server", "سيرفر"],
  ["subscription", "اشتراك"],
  ["drip-feed", "تغذية تدريجية"],
  ["drip feed", "تغذية تدريجية"],
  ["cancel", "إلغاء"],
  ["country", "الدولة"],
  ["worldwide", "عالمي"],
  ["organic", "عضوي"],
  ["website traffic", "زيارات الموقع"],
  ["app installs", "تثبيتات التطبيق"],
  ["music plays", "تشغيلات الموسيقى"],
  ["profile visits", "زيارات الملف الشخصي"],
  ["channel", "القناة"],
  ["group", "المجموعة"],
  ["post", "المنشور"],
  ["video", "الفيديو"],
  ["photo", "الصورة"],
  ["public", "عام"],
  ["private", "خاص"],
  ["verified", "موثّق"],
  ["discussion", "نقاش"],
  ["groups", "مجموعات"],
  ["group", "مجموعة"],
  ["page", "صفحة"],
  ["profile", "ملف شخصي"],
  ["drop", "نقص"],
  ["world", "عالمي"],
  ["default", "افتراضي"],
  ["service", "خدمة"],
  ["services", "خدمات"],
  ["подписчики", "متابعين"],
  ["подписчик", "متابع"],
  ["лайки", "إعجابات"],
  ["просмотры", "مشاهدات"],
  ["комментарии", "تعليقات"],
  ["репосты", "مشاركات"],
  ["сохранения", "حفظ"],
  ["сторис", "قصص"],
  ["прямой эфир", "بث مباشر"],
  ["быстро", "سريع"],
  ["гарантия", "ضمان"],
  ["перезаполнение", "إعادة تعبئة"],
  ["дней", "أيام"],
  ["день", "يوم"],
  ["粉丝", "متابعين"],
  ["点赞", "إعجابات"],
  ["观看", "مشاهدات"],
  ["评论", "تعليقات"],
  ["分享", "مشاركات"],
  ["收藏", "حفظ"],
  ["直播", "بث مباشر"],
  ["真实", "حقيقي"],
  ["快速", "سريع"],
  ["保证", "ضمان"],
  ["फ़ॉलोअर्स", "متابعين"],
  ["लाइक्स", "إعجابات"],
  ["व्यूज़", "مشاهدات"],
  ["कमेंट", "تعليق"],
  ["शेयर", "مشاركة"],
  ["रील्स", "ريلز"],
  ["लाइव", "مباشر"],
  ["दिन", "أيام"],
  ["और", "و"],
];

const SORTED_PHRASES = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
const CACHE = new Map<string, string>();

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function protectTokens(value: string): { text: string; tokens: string[] } {
  const tokens: string[] = [];
  const text = value.replace(SOURCE_TOKEN_RE, (token) => {
    const index = tokens.push(token) - 1;
    return `${PLACEHOLDER}${index}__`;
  });
  return { text, tokens };
}

function restoreTokens(value: string, tokens: string[]): string {
  return value.replace(new RegExp(`${PLACEHOLDER}(\\d+)__`, "g"), (_, index: string) => tokens[Number(index)] ?? "");
}

function replacePhrase(text: string, source: string, target: string): string {
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, "giu"), `$1${target}`);
}

function tidyArabic(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,،.!؟:؛)\]])/g, "$1")
    .replace(/([[(])\s+/g, "$1")
    .replace(/\s*،\s*/g, "، ")
    .replace(/\s*؛\s*/g, "؛ ")
    .replace(/،\s+([.!؟])/g, "،$1")
    .trim();
}

function normalizeStyledLatin(value: string): string {
  // NFKC يحوّل الحروف الرياضية/العريضة المزخرفة إلى حروفها العادية،
  // مع إبقاء الإيموجي والأرقام والرموز الأخرى كما هي.
  return value.normalize("NFKC");
}

function translateLocal(value: string): string {
  const decoded = normalizeStyledLatin(decodeEntities(value.trim()));
  if (!decoded || ARABIC_RE.test(decoded) && !LATIN_RE.test(decoded)) return decoded;
  const { text: protectedText, tokens } = protectTokens(decoded);
  let translated = protectedText;
  for (const [source, target] of SORTED_PHRASES) {
    translated = replacePhrase(translated, source, target);
  }
  return tidyArabic(restoreTokens(translated, tokens));
}

export function translateServiceText(value: unknown, kind: ServiceTextKind = "description"): string {
  const original = String(value ?? "").trim();
  if (!original) return "";
  const key = `${kind}:${original}`;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const translated = translateLocal(original);
  CACHE.set(key, translated);
  return translated;
}

export function translateServiceName(value: unknown): string {
  return translateServiceText(value, "name");
}

export function translateServiceDescription(value: unknown): string {
  return translateServiceText(value, "description");
}

export function translateCategory(value: unknown): string {
  return translateServiceText(value, "category");
}

export function translationFingerprint(name: unknown, description: unknown): string {
  return createHash("sha256")
    .update(`${String(name ?? "").trim()}\n${String(description ?? "").trim()}`)
    .digest("hex")
    .slice(0, 16);
}

export function isOpaqueServiceText(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return !text || /^svc_[a-f0-9]{20}$/i.test(text) || /^provider:\d+$/i.test(text);
}

export function buildFallbackDescription(name: string, category: string, type: string, min: number, max: number): string {
  const translatedName = translateServiceName(name);
  const translatedCategory = translateCategory(category);
  const translatedType = translateServiceName(type || "service");
  const bounds = `الحد الأدنى ${min || 0}، والحد الأقصى ${max || 0}`;
  if (translatedName && translatedName !== "الخدمة") return `${translatedName} — ${translatedType} ضمن فئة ${translatedCategory || "عام"}، ${bounds}.`;
  return `خدمة ${translatedType} ضمن فئة ${translatedCategory || "عام"}، ${bounds}.`;
}

export function clearServiceTranslationCache(): void {
  CACHE.clear();
}
