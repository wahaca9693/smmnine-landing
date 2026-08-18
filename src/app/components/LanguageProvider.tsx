"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "ar" | "en" | "ru" | "zh" | "hi";

export const LOCALES: Locale[] = ["ar", "en", "ru", "zh", "hi"];

export const LOCALE_META: Record<Locale, {
  name: string;
  nativeName: string;
  flag: string;
  dir: "rtl" | "ltr";
  short: string;
}> = {
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇦🇪", dir: "rtl", short: "AR" },
  en: { name: "English", nativeName: "English", flag: "🇺🇸", dir: "ltr", short: "EN" },
  ru: { name: "Russian", nativeName: "Русский", flag: "🇷🇺", dir: "ltr", short: "RU" },
  zh: { name: "Chinese", nativeName: "中文", flag: "🇨🇳", dir: "ltr", short: "中文" },
  hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", dir: "ltr", short: "हि" },
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
  localeMeta: typeof LOCALE_META[Locale];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const COOKIE_NAME = "follower-locale";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${expires};SameSite=Lax`;
}

type Dictionary = Record<string, string>;

const common: Dictionary = {
  "sidebar.menu": "Menu",
  "sidebar.settings": "Settings",
  "sidebar.language": "Language",
  "sidebar.services": "Services",
  "sidebar.orders": "My Orders",
  "sidebar.actions": "Cancel, Refill, Speed Up",
  "sidebar.autoRefill": "Auto Refill",
  "sidebar.deposit": "Deposit",
  "sidebar.transactions": "Transactions",
  "sidebar.updates": "Updates",
  "sidebar.terms": "Terms of Use",
  "sidebar.createSite": "Create Your Free Site",
  "sidebar.siteManagement": "Site Management",
  "sidebar.adminPanel": "Admin Panel",
  "sidebar.logout": "Logout",
  "sidebar.close": "Close",
  "language.title": "Select Language",
  "language.subtitle": "The change applies across the entire platform",
  "language.ar": "Arabic",
  "language.en": "English",
  "language.ru": "Russian",
  "language.zh": "Chinese",
  "language.hi": "Hindi",
  "settings.title": "Settings",
  "settings.subtitle": "Manage your account preferences",
  "settings.languageTitle": "Platform language",
  "settings.languageDescription": "Choose the language used across the platform.",
  "settings.languageSaved": "Language updated successfully",
  "settings.languageNote": "Your selection is saved automatically and applies to all pages.",
  "bottomNav.services": "Services",
  "bottomNav.deposit": "Deposit",
  "bottomNav.newOrder": "New Order",
  "bottomNav.orders": "Orders",
  "bottomNav.support": "Support",
  "header.notifications": "Notifications",
  "header.noNotifications": "No notifications",
  "header.menu": "Menu",
  "header.profile": "Profile",
  "dashboard.supportCenter": "Support Center",
  "dashboard.supportCenterDesc": "Choose the support type that suits you — technical support for general cases, or AI for instant actions on your orders.",
  "dashboard.techSupport": "Technical Support",
  "dashboard.techSupportDesc": "For inquiries and issues that require human review from the team.",
  "dashboard.aiSupport": "AI Support",
  "dashboard.aiSupportDesc": "Instant actions on your orders — cancel, speed up, or refill.",
  "dashboard.previousTickets": "View Previous Tickets",
  "dashboard.whatsapp": "WhatsApp",
  "dashboard.telegram": "Telegram",
  "dashboard.support": "Support",
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.create": "Create",
  "common.active": "Active",
  "common.inactive": "Inactive",
  "common.status": "Status",
  "order.all": "All",
  "order.pending": "Pending",
  "order.inProgress": "In Progress",
  "order.partial": "Partial",
  "order.completed": "Completed",
  "order.canceled": "Canceled",
  "order.failed": "Failed",
  "order.refunded": "Refunded",
  "order.reviewing": "Reviewing",
  "order.total": "Total",
  "order.search": "Search by order ID or service name...",
  "order.noOrders": "No orders",
  "order.units": "units",
  "order.amount": "Amount",
  "order.quantity": "Quantity",
  "order.number": "Order ID",
  "order.details": "Order Details",
  "order.service": "Service",
  "order.remaining": "Remaining",
  "order.startCount": "Start Count",
  "order.track": "Track Order",
  "order.noData": "—",
  "order.speed": "Fast",
  "order.slow": "Slow",
  "ticket.myTickets": "My Tickets",
  "ticket.back": "Back to Support Center",
  "ticket.noTickets": "No tickets yet",
  "ticket.noTicketsDesc": "You can create a new ticket from the Support Center",
  "ticket.status.open": "Open",
  "ticket.status.resolved": "Replied",
  "ticket.status.closed": "Closed",
  "ticket.status.replied": "Replied",
  "ticket.adminReply": "Admin Reply",
  "ticket.orderNumber": "Order ID",
  "ticket.created": "Created at",
  "ticket.submit": "Submit",
  "ticket.sent": "Ticket submitted",
  "ticket.willReply": "We will reply as soon as possible",
  "ticket.replyWithin": "A ticket will be created in My Tickets and the team will reply within 24 hours.",
  "ticket.chooseType": "Choose the issue type",
  "ticket.title": "Title",
  "ticket.titlePh": "e.g. Issue with a followers order",
  "ticket.orderId": "Order ID (optional)",
  "ticket.orderIdPh": "12345",
  "ticket.describe": "Describe your issue in detail",
  "ticket.describePh": "Write a clear description of the issue...",
  "ticket.selectFirst": "Please choose the issue type first",
  "ticket.type.speed_up": "Speed Up Order",
  "ticket.type.refill": "Refill Order",
  "ticket.type.recharge_issue": "Deposit Issue",
  "ticket.type.cancel_order": "Cancel Order",
  "ticket.type.other": "Other Issue",
  "ticket.type.inquiry": "General Inquiry",
  "service.title": "Services", "service.subtitle": "Choose your platform and find the perfect service for your growth", "service.availableCount": "services available", "service.lastUpdatedPrefix": "Last update", "service.loadingError": "We could not load the services", "service.retry": "Try again", "service.new": "New", "service.per1000": "per 1000", "service.orderThis": "Order this service", "service.guaranteedPrompt": "Choose the platform whose guaranteed services you want to view:", "service.changePlatform": "← Change platform", "service.noGuaranteed": "No guaranteed services are currently available for this platform", "service.allShort": "All", "service.guaranteedFor": "Guaranteed services for", "service.categoryDefault": "General",
  "service.all": "All",
  "service.platforms": "Platforms",
  "service.types": "Service Types",
  "service.categories": "Categories",
  "service.search": "Search services by name or ID...",
  "service.refresh": "Refresh",
  "service.available": "services available",
  "service.lastSync": "Last update",
  "service.syncing": "Syncing catalog",
  "service.syncError": "Unable to update catalog",
  "service.guaranteed": "Guaranteed Services",
  "service.guaranteedDesc": "Selected services with guarantee • automatic refill • lifetime",
  "service.noResults": "No services found",
  "service.addOrder": "Place Order",
  "service.provider": "Provider",
  "service.general": "General",
  "service.badge.guaranteed": "Guaranteed",
  "service.badge.lifetime": "Lifetime",
  "service.badge.instant": "Instant",
  "service.badge.refill": "Automatic Refill",
  "platform.facebook": "Facebook",
  "platform.tiktok": "TikTok",
  "platform.instagram": "Instagram",
  "platform.whatsapp": "WhatsApp",
  "platform.twitter": "Twitter / X",
  "platform.youtube": "YouTube",
  "platform.telegram": "Telegram",
  "platform.discord": "Discord",
  "platform.snapchat": "Snapchat",
  "platform.threads": "Threads",
  "platform.twitch": "Twitch",
  "platform.kuaishou": "Kuaishou",
  "platform.likee": "Likee",
  "platform.spotify": "Spotify",
  "platform.other": "Other",
  "type.followers": "Followers",
  "type.likes": "Likes",
  "type.views": "Views",
  "type.comments": "Comments",
  "type.shares": "Shares",
  "type.saves": "Saves",
  "type.votes": "Votes",
  "type.stories": "Stories",
  "type.reels": "Reels",
  "type.live": "Live",
  "type.other": "Other",
  "auth.createAccount": "Create Account",
  "auth.backToLogin": "Back to Login",
  "auth.welcomeBack": "Welcome Back",
  "auth.loginSubtitle": "Enter your details to access your account",
  "auth.registerSubtitle": "Create your account and start your journey",
  "auth.username": "Username",
  "auth.usernamePlaceholder": "Enter username",
  "auth.email": "Email address",
  "auth.password": "Password",
  "auth.passwordHint": "At least 8 characters with letters and numbers",
  "auth.acceptTerms": "I agree to the Terms of Use",
  "auth.compensationPolicy": "and compensation policy. I confirm that I have read the terms of each service.",
  "auth.terms": "Terms of Use",
  "auth.login": "Login",
  "auth.creating": "Creating...",
  "auth.loggingIn": "Signing in...",
  "auth.noAccount": "Don't have an account? Sign up free",
  "auth.hasAccount": "Already have an account? Sign in",
  "auth.autoCrypto": "Automatic crypto deposits",
  "auth.autoCryptoDesc": "Instant deposits via BSC / TRON and more",
  "auth.instantExecution": "Instant execution",
  "auth.instantExecutionDesc": "Your orders start within seconds",
  "status.platformOnline": "Platform is online",
  "status.offline": "Temporarily unavailable",
  "status.checking": "Checking connection",
  "auth.passwordMinError": "Password must be at least 8 characters",
  "auth.passwordLetterError": "Password must contain at least one letter",
  "auth.passwordNumberError": "Password must contain at least one number",
  "auth.emailRequired": "Email is required",
  "auth.emailInvalid": "Invalid email address",
  "auth.termsRequired": "You must accept the Terms of Use",
};

const dictionaries: Record<Locale, Dictionary> = {
  en: common,
  ar: {
    ...common,
    "sidebar.menu": "القائمة", "sidebar.settings": "الإعدادات", "sidebar.language": "اللغة", "sidebar.services": "الخدمات", "sidebar.orders": "طلباتي", "sidebar.actions": "إلغاء، تعويض، تسريع الطلبات", "sidebar.autoRefill": "التعبئة التلقائية", "sidebar.deposit": "شحن الرصيد", "sidebar.transactions": "سجل المعاملات", "sidebar.updates": "التحديثات", "sidebar.terms": "شروط الاستخدام", "sidebar.createSite": "أنشئ موقعك مجاناً", "sidebar.siteManagement": "إدارة موقعك", "sidebar.adminPanel": "لوحة الأدمن", "sidebar.logout": "تسجيل الخروج", "sidebar.close": "إغلاق",
    "language.title": "اختر اللغة", "language.subtitle": "سيُطبق التغيير على كامل المنصة", "language.ar": "العربية", "language.en": "الإنجليزية", "language.ru": "الروسية", "language.zh": "الصينية", "language.hi": "الهندية",
    "settings.title": "الإعدادات", "settings.subtitle": "إدارة تفضيلات حسابك", "settings.languageTitle": "لغة المنصة", "settings.languageDescription": "اختر اللغة المستخدمة في جميع أجزاء المنصة.", "settings.languageSaved": "تم تحديث اللغة بنجاح", "settings.languageNote": "يُحفظ اختيارك تلقائيًا ويُطبق على جميع الصفحات.",
    "auth.createAccount": "إنشاء حساب", "auth.backToLogin": "العودة لتسجيل الدخول", "auth.welcomeBack": "مرحبًا بعودتك", "auth.loginSubtitle": "أدخل بياناتك للدخول إلى حسابك", "auth.registerSubtitle": "سجّل حسابك الجديد وابدأ رحلتك معنا", "auth.username": "اسم المستخدم", "auth.usernamePlaceholder": "أدخل اسم المستخدم", "auth.email": "البريد الإلكتروني", "auth.password": "كلمة المرور", "auth.passwordHint": "8 أحرف على الأقل، تحتوي على حروف وأرقام", "auth.acceptTerms": "أوافق على شروط الاستخدام", "auth.compensationPolicy": "وسياسة التعويض. أقر بأنني قرأت شروط كل خدمة قبل الطلب.", "auth.terms": "شروط الاستخدام", "auth.login": "دخول", "auth.creating": "جاري الإنشاء...", "auth.loggingIn": "جاري الدخول...", "auth.noAccount": "ليس لديك حساب؟ سجّل الآن مجانًا", "auth.hasAccount": "لديك حساب؟ سجل الدخول", "auth.autoCrypto": "شحن تلقائي بالعملات", "auth.autoCryptoDesc": "شحن فوري عبر BSC / TRON وغيرها", "auth.instantExecution": "تنفيذ فوري", "auth.instantExecutionDesc": "طلباتك تبدأ خلال ثوانٍ معدودة", "status.platformOnline": "المنصة متاحة الآن", "status.offline": "تعذر الاتصال مؤقتًا", "status.checking": "جارٍ فحص الاتصال", "auth.passwordMinError": "كلمة المرور يجب أن تكون 8 أحرف على الأقل", "auth.passwordLetterError": "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل", "auth.passwordNumberError": "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل", "auth.emailRequired": "البريد الإلكتروني مطلوب", "auth.emailInvalid": "البريد الإلكتروني غير صالح", "auth.termsRequired": "يجب الموافقة على شروط الاستخدام",
    "bottomNav.services": "خدمات", "bottomNav.deposit": "شحن الرصيد", "bottomNav.newOrder": "طلب جديد", "bottomNav.orders": "طلباتي", "bottomNav.support": "الدعم الفني",
    "header.notifications": "الإشعارات", "header.noNotifications": "لا توجد إشعارات", "header.menu": "القائمة", "header.profile": "الملف الشخصي",
    "dashboard.supportCenter": "مركز الدعم", "dashboard.supportCenterDesc": "اختر نوع الدعم الذي يناسبك — الدعم الفني للحالات العامة، أو الذكاء الاصطناعي لإجراءات فورية على طلباتك.", "dashboard.techSupport": "الدعم الفني", "dashboard.techSupportDesc": "لجميع الاستفسارات والمشاكل التي تحتاج لمراجعة بشرية من الفريق.", "dashboard.aiSupport": "دعم الذكاء الاصطناعي", "dashboard.aiSupportDesc": "إجراءات فورية على طلباتك — إلغاء، تسريع، أو تعويض.", "dashboard.previousTickets": "عرض تذاكري السابقة", "dashboard.whatsapp": "واتساب", "dashboard.telegram": "تيليجرام", "dashboard.support": "دعم",
    "common.loading": "جاري التحميل...", "common.save": "حفظ", "common.cancel": "إلغاء", "common.delete": "حذف", "common.create": "إنشاء", "common.active": "نشط", "common.inactive": "غير نشط", "common.status": "الحالة",
    "order.all": "الكل", "order.pending": "معلق", "order.inProgress": "قيد التنفيذ", "order.partial": "جزئي", "order.completed": "مكتمل", "order.canceled": "ملغي", "order.failed": "فاشل", "order.refunded": "مسترد", "order.reviewing": "جاري المراجعة", "order.total": "الإجمالي", "order.search": "ابحث برقم الطلب أو اسم الخدمة...", "order.noOrders": "لا توجد طلبات", "order.units": "وحدة", "order.amount": "المبلغ", "order.quantity": "الكمية", "order.number": "رقم الطلب", "order.details": "تفاصيل الطلب", "order.service": "الخدمة", "order.remaining": "المتبقي", "order.startCount": "عند البداية", "order.track": "تتبع حالة الطلب", "order.speed": "سريع", "order.slow": "بطيء",
    "ticket.myTickets": "تذاكري", "ticket.back": "رجوع لمركز الدعم", "ticket.noTickets": "لا توجد تذاكر بعد", "ticket.noTicketsDesc": "يمكنك إنشاء تذكرة جديدة من مركز الدعم", "ticket.status.open": "مفتوحة", "ticket.status.resolved": "تم الرد", "ticket.status.closed": "مغلقة", "ticket.status.replied": "تم الرد", "ticket.adminReply": "رد الإدارة", "ticket.orderNumber": "رقم الطلب", "ticket.created": "أنشئت في", "ticket.submit": "إرسال", "ticket.sent": "تم إرسال التذكرة", "ticket.willReply": "سنرد عليك في أقرب وقت", "ticket.replyWithin": "ستُنشأ تذكرة في قسم تذاكري ويردّ عليك الفريق خلال 24 ساعة.", "ticket.chooseType": "اختر نوع المشكلة", "ticket.title": "العنوان", "ticket.titlePh": "مثلاً: مشكلة في طلب زيادة متابعين", "ticket.orderId": "رقم الطلب (اختياري)", "ticket.describe": "صف مشكلتك بالتفصيل", "ticket.describePh": "اكتب وصفاً واضحاً للمشكلة...", "ticket.selectFirst": "اختر نوع المشكلة أولاً", "ticket.type.speed_up": "تسريع طلب", "ticket.type.refill": "تعويض طلب", "ticket.type.recharge_issue": "مشكلة في الشحن", "ticket.type.cancel_order": "إلغاء طلب", "ticket.type.other": "مشكلة أخرى", "ticket.type.inquiry": "استفسار عام",
    "service.title": "الخدمات", "service.subtitle": "اختر منصتك واعثر على الخدمة المثالية لنمو حسابك", "service.availableCount": "خدمة متاحة", "service.lastUpdatedPrefix": "آخر تحديث", "service.loadingError": "لم نتمكن من تحميل الخدمات", "service.retry": "إعادة المحاولة", "service.new": "جديد", "service.per1000": "لكل 1000", "service.orderThis": "اطلب هذه الخدمة", "service.guaranteedPrompt": "اختر المنصة التي تريد مشاهدة خدماتها المضمونة:", "service.changePlatform": "← تغيير المنصة", "service.noGuaranteed": "لا توجد خدمات مضمونة لهذه المنصة حاليًا", "service.allShort": "الكل", "service.guaranteedFor": "الخدمات المضمونة لـ", "service.categoryDefault": "عام",
    "service.all": "الكل", "service.platforms": "المنصات", "service.types": "أنواع الخدمات", "service.categories": "الفئات", "service.search": "ابحث عن خدمة بالاسم أو الرقم...", "service.refresh": "تحديث", "service.available": "خدمة متاحة", "service.lastSync": "آخر تحديث", "service.syncing": "جارٍ مزامنة الكتالوج", "service.syncError": "تعذر تحديث الكتالوج", "service.guaranteed": "الخدمات المضمونة", "service.guaranteedDesc": "خدمات مختارة بضمان • تعويض تلقائي • مدى الحياة", "service.noResults": "لا توجد خدمات", "service.addOrder": "اطلب الآن", "service.provider": "المزود", "service.general": "عام", "service.badge.guaranteed": "مضمونة", "service.badge.lifetime": "مدى الحياة", "service.badge.instant": "فورية", "service.badge.refill": "تعويض تلقائي",
    "platform.facebook": "فيسبوك", "platform.tiktok": "تيك توك", "platform.instagram": "إنستغرام", "platform.whatsapp": "واتساب", "platform.twitter": "تويتر / X", "platform.youtube": "يوتيوب", "platform.telegram": "تيليجرام", "platform.discord": "ديسكورد", "platform.snapchat": "سناب شات", "platform.threads": "ثريدز", "platform.twitch": "تويتش", "platform.kuaishou": "كواي", "platform.likee": "لايكي", "platform.spotify": "سبوتيفاي", "platform.other": "أخرى",
    "type.followers": "متابعين", "type.likes": "لايكات", "type.views": "مشاهدات", "type.comments": "تعليقات", "type.shares": "مشاركات", "type.saves": "حفظ", "type.votes": "تصويت", "type.stories": "ستوريات", "type.reels": "ريلز", "type.live": "بث مباشر", "type.other": "أخرى",
  },
  ru: {
    ...common,
    "sidebar.menu": "Меню", "sidebar.settings": "Настройки", "sidebar.language": "Язык", "sidebar.services": "Услуги", "sidebar.orders": "Мои заказы", "sidebar.actions": "Отмена, пополнение, ускорение", "sidebar.autoRefill": "Автопополнение", "sidebar.deposit": "Пополнить баланс", "sidebar.transactions": "История операций", "sidebar.updates": "Обновления", "sidebar.terms": "Условия использования", "sidebar.createSite": "Создать сайт бесплатно", "sidebar.siteManagement": "Управление сайтом", "sidebar.adminPanel": "Панель администратора", "sidebar.logout": "Выйти",
    "language.title": "Выберите язык", "language.subtitle": "Изменение применяется ко всей платформе", "language.ar": "Арабский", "language.en": "Английский", "language.ru": "Русский", "language.zh": "Китайский", "language.hi": "Хинди",
    "settings.title": "Настройки", "settings.subtitle": "Управление настройками аккаунта", "settings.languageTitle": "Язык платформы", "settings.languageDescription": "Выберите язык для всей платформы.", "settings.languageSaved": "Язык успешно обновлён", "settings.languageNote": "Выбор сохраняется автоматически и применяется на всех страницах.",
    "auth.createAccount": "Создать аккаунт", "auth.backToLogin": "Вернуться ко входу", "auth.welcomeBack": "С возвращением", "auth.loginSubtitle": "Введите данные для доступа к аккаунту", "auth.registerSubtitle": "Создайте аккаунт и начните пользоваться платформой", "auth.username": "Имя пользователя", "auth.usernamePlaceholder": "Введите имя пользователя", "auth.email": "Электронная почта", "auth.password": "Пароль", "auth.passwordHint": "Не менее 8 символов, включая буквы и цифры", "auth.acceptTerms": "Я принимаю условия использования", "auth.compensationPolicy": "и политику компенсаций. Я прочитал условия каждой услуги.", "auth.terms": "Условия использования", "auth.login": "Войти", "auth.creating": "Создание...", "auth.loggingIn": "Вход...", "auth.noAccount": "Нет аккаунта? Зарегистрируйтесь бесплатно", "auth.hasAccount": "Уже есть аккаунт? Войти", "auth.autoCrypto": "Автоматическое криптопополнение", "auth.autoCryptoDesc": "Мгновенное пополнение через BSC / TRON и другие сети", "auth.instantExecution": "Мгновенное выполнение", "auth.instantExecutionDesc": "Ваши заказы начнутся в течение секунд", "status.platformOnline": "Платформа доступна", "status.offline": "Временно недоступно", "status.checking": "Проверка соединения", "auth.passwordMinError": "Пароль должен содержать не менее 8 символов", "auth.passwordLetterError": "Пароль должен содержать хотя бы одну букву", "auth.passwordNumberError": "Пароль должен содержать хотя бы одну цифру", "auth.emailRequired": "Введите электронную почту", "auth.emailInvalid": "Неверный адрес электронной почты", "auth.termsRequired": "Необходимо принять условия использования",
    "bottomNav.services": "Услуги", "bottomNav.deposit": "Пополнить", "bottomNav.newOrder": "Новый заказ", "bottomNav.orders": "Заказы", "bottomNav.support": "Поддержка", "header.notifications": "Уведомления", "header.noNotifications": "Нет уведомлений", "header.menu": "Меню", "header.profile": "Профиль",
    "common.loading": "Загрузка...", "common.save": "Сохранить", "common.cancel": "Отмена", "common.delete": "Удалить", "common.create": "Создать", "common.active": "Активен", "common.inactive": "Неактивен", "common.status": "Статус",
    "order.all": "Все", "order.pending": "Ожидает", "order.inProgress": "Выполняется", "order.partial": "Частично", "order.completed": "Завершён", "order.canceled": "Отменён", "order.failed": "Ошибка", "order.refunded": "Возврат", "order.reviewing": "На проверке", "order.total": "Всего", "order.search": "Поиск по номеру заказа или названию услуги...", "order.noOrders": "Заказов нет", "order.units": "ед.", "order.amount": "Сумма", "order.quantity": "Количество", "order.number": "Номер заказа", "order.details": "Детали заказа", "order.service": "Услуга",
    "ticket.myTickets": "Мои тикеты", "ticket.back": "Вернуться в поддержку", "ticket.noTickets": "Тикетов пока нет", "ticket.noTicketsDesc": "Создайте новый тикет в центре поддержки", "ticket.status.open": "Открыт", "ticket.status.resolved": "Отвечен", "ticket.status.closed": "Закрыт", "ticket.submit": "Отправить", "ticket.sent": "Тикет отправлен", "ticket.willReply": "Мы ответим как можно скорее", "ticket.chooseType": "Выберите тип проблемы", "ticket.title": "Заголовок", "ticket.orderId": "Номер заказа (необязательно)", "ticket.describe": "Опишите проблему подробно", "ticket.selectFirst": "Сначала выберите тип проблемы", "ticket.type.speed_up": "Ускорить заказ", "ticket.type.refill": "Пополнить заказ", "ticket.type.recharge_issue": "Проблема с пополнением", "ticket.type.cancel_order": "Отменить заказ", "ticket.type.other": "Другая проблема", "ticket.type.inquiry": "Общий вопрос",
    "service.title": "Услуги", "service.subtitle": "Выберите платформу и найдите идеальную услугу для роста аккаунта", "service.availableCount": "доступных услуг", "service.lastUpdatedPrefix": "Последнее обновление", "service.loadingError": "Не удалось загрузить услуги", "service.retry": "Повторить", "service.new": "Новое", "service.per1000": "за 1000", "service.orderThis": "Заказать эту услугу", "service.guaranteedPrompt": "Выберите платформу, чтобы посмотреть услуги с гарантией:", "service.changePlatform": "← Изменить платформу", "service.noGuaranteed": "Для этой платформы сейчас нет услуг с гарантией", "service.allShort": "Все", "service.guaranteedFor": "Услуги с гарантией для", "service.categoryDefault": "Общее",
    "service.all": "Все", "service.platforms": "Платформы", "service.types": "Типы услуг", "service.categories": "Категории", "service.search": "Поиск услуги по названию или номеру...", "service.refresh": "Обновить", "service.available": "доступных услуг", "service.lastSync": "Последнее обновление", "service.syncing": "Синхронизация каталога", "service.syncError": "Не удалось обновить каталог", "service.guaranteed": "Гарантированные услуги", "service.guaranteedDesc": "Выбранные услуги с гарантией • автопополнение • пожизненно", "service.noResults": "Услуги не найдены", "service.addOrder": "Заказать", "service.provider": "Провайдер", "service.general": "Общее", "service.badge.guaranteed": "Гарантия", "service.badge.lifetime": "Пожизненно", "service.badge.instant": "Мгновенно", "service.badge.refill": "Автопополнение",
    "platform.facebook": "Facebook", "platform.tiktok": "TikTok", "platform.instagram": "Instagram", "platform.whatsapp": "WhatsApp", "platform.twitter": "Twitter / X", "platform.youtube": "YouTube", "platform.telegram": "Telegram", "platform.discord": "Discord", "platform.snapchat": "Snapchat", "platform.threads": "Threads", "platform.twitch": "Twitch", "platform.kuaishou": "Kuaishou", "platform.likee": "Likee", "platform.spotify": "Spotify", "platform.other": "Другое",
    "type.followers": "Подписчики", "type.likes": "Лайки", "type.views": "Просмотры", "type.comments": "Комментарии", "type.shares": "Репосты", "type.saves": "Сохранения", "type.votes": "Голоса", "type.stories": "Истории", "type.reels": "Рилсы", "type.live": "Прямой эфир", "type.other": "Другое",
  },
  zh: {
    ...common,
    "sidebar.menu": "菜单", "sidebar.settings": "设置", "sidebar.language": "语言", "sidebar.services": "服务", "sidebar.orders": "我的订单", "sidebar.actions": "取消、补发、加速", "sidebar.autoRefill": "自动补发", "sidebar.deposit": "充值", "sidebar.transactions": "交易记录", "sidebar.updates": "更新", "sidebar.terms": "使用条款", "sidebar.createSite": "免费创建网站", "sidebar.siteManagement": "网站管理", "sidebar.adminPanel": "管理面板", "sidebar.logout": "退出登录",
    "language.title": "选择语言", "language.subtitle": "更改将应用于整个平台注册", "language.ar": "阿拉伯语", "language.en": "英语", "language.ru": "俄语", "language.zh": "中文", "language.hi": "印地语",
    "settings.title": "设置", "settings.subtitle": "管理您的账户偏好", "settings.languageTitle": "平台语言", "settings.languageDescription": "选择整个平台使用的语言。", "settings.languageSaved": "语言更新成功", "settings.languageNote": "您的选择会自动保存，并应用于所有页面。",
    "auth.createAccount": "创建账户", "auth.backToLogin": "返回登录", "auth.welcomeBack": "欢迎回来", "auth.loginSubtitle": "输入信息以访问您的账户", "auth.registerSubtitle": "创建账户，开启您的旅程", "auth.username": "用户名", "auth.usernamePlaceholder": "输入用户名", "auth.email": "电子邮箱", "auth.password": "密码", "auth.passwordHint": "至少8个字符，包含字母和数字", "auth.acceptTerms": "我同意使用条款", "auth.compensationPolicy": "和补偿政策。我确认已阅读每项服务的条款。", "auth.terms": "使用条款", "auth.login": "登录", "auth.creating": "创建中...", "auth.loggingIn": "正在登录...", "auth.noAccount": "还没有账户？免费注册", "auth.hasAccount": "已有账户？登录", "auth.autoCrypto": "自动加密货币充值", "auth.autoCryptoDesc": "支持 BSC / TRON 等网络即时充值", "auth.instantExecution": "即时执行", "auth.instantExecutionDesc": "您的订单将在几秒内开始", "status.platformOnline": "平台在线", "status.offline": "暂时无法连接", "status.checking": "正在检查连接", "auth.passwordMinError": "密码至少需要8个字符", "auth.passwordLetterError": "密码必须包含至少一个字母", "auth.passwordNumberError": "密码必须包含至少一个数字", "auth.emailRequired": "请输入电子邮箱", "auth.emailInvalid": "电子邮箱格式无效", "auth.termsRequired": "请同意使用条款",
    "bottomNav.services": "服务", "bottomNav.deposit": "充值", "bottomNav.newOrder": "新订单", "bottomNav.orders": "订单", "bottomNav.support": "支持", "header.notifications": "通知", "header.noNotifications": "暂无通知", "header.menu": "菜单", "header.profile": "个人资料",
    "common.loading": "加载中...", "common.save": "保存", "common.cancel": "取消", "common.delete": "删除", "common.create": "创建", "common.active": "启用", "common.inactive": "停用", "common.status": "状态",
    "order.all": "全部", "order.pending": "待处理", "order.inProgress": "进行中", "order.partial": "部分完成", "order.completed": "已完成", "order.canceled": "已取消", "order.failed": "失败", "order.refunded": "已退款", "order.reviewing": "审核中", "order.total": "总计", "order.search": "按订单号或服务名称搜索...", "order.noOrders": "暂无订单", "order.units": "单位", "order.amount": "金额", "order.quantity": "数量", "order.number": "订单号", "order.details": "订单详情", "order.service": "服务",
    "ticket.myTickets": "我的工单", "ticket.back": "返回支持中心", "ticket.noTickets": "暂无工单", "ticket.noTicketsDesc": "您可以从支持中心创建新工单", "ticket.status.open": "开放", "ticket.status.resolved": "已回复", "ticket.status.closed": "已关闭", "ticket.submit": "提交", "ticket.sent": "工单已提交", "ticket.willReply": "我们会尽快回复", "ticket.chooseType": "选择问题类型", "ticket.title": "标题", "ticket.orderId": "订单号（可选）", "ticket.describe": "详细描述问题", "ticket.selectFirst": "请先选择问题类型", "ticket.type.speed_up": "加速订单", "ticket.type.refill": "补发订单", "ticket.type.recharge_issue": "充值问题", "ticket.type.cancel_order": "取消订单", "ticket.type.other": "其他问题", "ticket.type.inquiry": "一般咨询",
    "service.title": "服务", "service.subtitle": "选择平台，找到适合账号增长的服务", "service.availableCount": "项可用服务", "service.lastUpdatedPrefix": "最后更新", "service.loadingError": "无法加载服务", "service.retry": "重试", "service.new": "新品", "service.per1000": "每1000", "service.orderThis": "立即下单", "service.guaranteedPrompt": "选择要查看保障服务的平台：", "service.changePlatform": "← 更换平台", "service.noGuaranteed": "该平台目前没有可用的保障服务", "service.allShort": "全部", "service.guaranteedFor": "保障服务：", "service.categoryDefault": "一般",
    "service.all": "全部", "service.platforms": "平台", "service.types": "服务类型", "service.categories": "分类", "service.search": "按名称或编号搜索服务...", "service.refresh": "刷新", "service.available": "项可用服务", "service.lastSync": "最后更新", "service.syncing": "正在同步目录", "service.syncError": "无法更新目录", "service.guaranteed": "有保障的服务", "service.guaranteedDesc": "精选服务 • 自动补发 • 终身保障", "service.noResults": "未找到服务", "service.addOrder": "立即下单", "service.provider": "供应商", "service.general": "一般", "service.badge.guaranteed": "有保障", "service.badge.lifetime": "终身", "service.badge.instant": "即时", "service.badge.refill": "自动补发",
    "platform.facebook": "Facebook", "platform.tiktok": "TikTok", "platform.instagram": "Instagram", "platform.whatsapp": "WhatsApp", "platform.twitter": "Twitter / X", "platform.youtube": "YouTube", "platform.telegram": "Telegram", "platform.discord": "Discord", "platform.snapchat": "Snapchat", "platform.threads": "Threads", "platform.twitch": "Twitch", "platform.kuaishou": "快手", "platform.likee": "Likee", "platform.spotify": "Spotify", "platform.other": "其他",
    "type.followers": "粉丝", "type.likes": "点赞", "type.views": "观看", "type.comments": "评论", "type.shares": "分享", "type.saves": "收藏", "type.votes": "投票", "type.stories": "动态", "type.reels": "短视频", "type.live": "直播", "type.other": "其他",
  },
  hi: {
    ...common,
    "sidebar.menu": "मेनू", "sidebar.settings": "सेटिंग्स", "sidebar.language": "भाषा", "sidebar.services": "सेवाएँ", "sidebar.orders": "मेरे ऑर्डर", "sidebar.actions": "रद्द, रीफिल, तेज़ करें", "sidebar.autoRefill": "ऑटो रीफिल", "sidebar.deposit": "बैलेंस जमा करें", "sidebar.transactions": "लेन-देन इतिहास", "sidebar.updates": "अपडेट", "sidebar.terms": "उपयोग की शर्तें", "sidebar.createSite": "मुफ़्त साइट बनाएँ", "sidebar.siteManagement": "साइट प्रबंधन", "sidebar.adminPanel": "एडमिन पैनल", "sidebar.logout": "लॉग आउट",
    "language.title": "भाषा चुनें", "language.subtitle": "बदलाव पूरे प्लेटफ़ॉर्म पर लागू होगा", "language.ar": "अरबी", "language.en": "अंग्रेज़ी", "language.ru": "रूसी", "language.zh": "चीनी", "language.hi": "हिन्दी",
    "settings.title": "सेटिंग्स", "settings.subtitle": "अपने खाते की प्राथमिकताएँ प्रबंधित करें", "settings.languageTitle": "प्लेटफ़ॉर्म की भाषा", "settings.languageDescription": "पूरे प्लेटफ़ॉर्म में उपयोग की जाने वाली भाषा चुनें।", "settings.languageSaved": "भाषा सफलतापूर्वक अपडेट हुई", "settings.languageNote": "आपका चयन अपने आप सहेजा जाएगा और सभी पृष्ठों पर लागू होगा।",
    "auth.createAccount": "खाता बनाएँ", "auth.backToLogin": "लॉगिन पर वापस जाएँ", "auth.welcomeBack": "वापसी पर स्वागत है", "auth.loginSubtitle": "अपने खाते में प्रवेश करने के लिए विवरण दर्ज करें", "auth.registerSubtitle": "अपना खाता बनाएँ और यात्रा शुरू करें", "auth.username": "उपयोगकर्ता नाम", "auth.usernamePlaceholder": "उपयोगकर्ता नाम दर्ज करें", "auth.email": "ईमेल पता", "auth.password": "पासवर्ड", "auth.passwordHint": "कम से कम 8 अक्षर, जिनमें अक्षर और अंक हों", "auth.acceptTerms": "मैं उपयोग की शर्तों से सहमत हूँ", "auth.compensationPolicy": "और मुआवज़ा नीति से। मैंने हर सेवा की शर्तें पढ़ ली हैं।", "auth.terms": "उपयोग की शर्तें", "auth.login": "लॉगिन", "auth.creating": "बनाया जा रहा है...", "auth.loggingIn": "लॉगिन हो रहा है...", "auth.noAccount": "खाता नहीं है? मुफ़्त साइन अप करें", "auth.hasAccount": "पहले से खाता है? लॉगिन करें", "auth.autoCrypto": "स्वचालित क्रिप्टो जमा", "auth.autoCryptoDesc": "BSC / TRON और अन्य नेटवर्क से तुरंत जमा", "auth.instantExecution": "तुरंत निष्पादन", "auth.instantExecutionDesc": "आपके ऑर्डर कुछ ही सेकंड में शुरू होंगे", "status.platformOnline": "प्लेटफ़ॉर्म ऑनलाइन है", "status.offline": "अस्थायी रूप से अनुपलब्ध", "status.checking": "कनेक्शन जाँचा जा रहा है", "auth.passwordMinError": "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए", "auth.passwordLetterError": "पासवर्ड में कम से कम एक अक्षर होना चाहिए", "auth.passwordNumberError": "पासवर्ड में कम से कम एक अंक होना चाहिए", "auth.emailRequired": "ईमेल आवश्यक है", "auth.emailInvalid": "अमान्य ईमेल पता", "auth.termsRequired": "आपको उपयोग की शर्तें स्वीकार करनी होंगी",
    "bottomNav.services": "सेवाएँ", "bottomNav.deposit": "जमा करें", "bottomNav.newOrder": "नया ऑर्डर", "bottomNav.orders": "ऑर्डर", "bottomNav.support": "सहायता", "header.notifications": "सूचनाएँ", "header.noNotifications": "कोई सूचना नहीं", "header.menu": "मेनू", "header.profile": "प्रोफ़ाइल",
    "common.loading": "लोड हो रहा है...", "common.save": "सहेजें", "common.cancel": "रद्द करें", "common.delete": "हटाएँ", "common.create": "बनाएँ", "common.active": "सक्रिय", "common.inactive": "निष्क्रिय", "common.status": "स्थिति",
    "order.all": "सभी", "order.pending": "लंबित", "order.inProgress": "प्रगति में", "order.partial": "आंशिक", "order.completed": "पूर्ण", "order.canceled": "रद्द", "order.failed": "विफल", "order.refunded": "वापस किया गया", "order.reviewing": "समीक्षा में", "order.total": "कुल", "order.search": "ऑर्डर नंबर या सेवा नाम से खोजें...", "order.noOrders": "कोई ऑर्डर नहीं", "order.units": "यूनिट", "order.amount": "राशि", "order.quantity": "मात्रा", "order.number": "ऑर्डर आईडी", "order.details": "ऑर्डर विवरण", "order.service": "सेवा",
    "ticket.myTickets": "मेरे टिकट", "ticket.back": "सहायता केंद्र पर वापस जाएँ", "ticket.noTickets": "अभी कोई टिकट नहीं", "ticket.noTicketsDesc": "सहायता केंद्र से नया टिकट बनाएँ", "ticket.status.open": "खुला", "ticket.status.resolved": "उत्तर दिया गया", "ticket.status.closed": "बंद", "ticket.submit": "भेजें", "ticket.sent": "टिकट भेज दिया गया", "ticket.willReply": "हम जल्द से जल्द उत्तर देंगे", "ticket.chooseType": "समस्या का प्रकार चुनें", "ticket.title": "शीर्षक", "ticket.orderId": "ऑर्डर आईडी (वैकल्पिक)", "ticket.describe": "समस्या का विवरण दें", "ticket.selectFirst": "पहले समस्या का प्रकार चुनें", "ticket.type.speed_up": "ऑर्डर तेज़ करें", "ticket.type.refill": "ऑर्डर रीफिल करें", "ticket.type.recharge_issue": "जमा करने में समस्या", "ticket.type.cancel_order": "ऑर्डर रद्द करें", "ticket.type.other": "अन्य समस्या", "ticket.type.inquiry": "सामान्य प्रश्न",
    "service.title": "सेवाएँ", "service.subtitle": "अपना प्लेटफ़ॉर्म चुनें और अकाउंट बढ़ाने के लिए सही सेवा पाएँ", "service.availableCount": "उपलब्ध सेवाएँ", "service.lastUpdatedPrefix": "अंतिम अपडेट", "service.loadingError": "सेवाएँ लोड नहीं हो सकीं", "service.retry": "पुनः प्रयास", "service.new": "नया", "service.per1000": "प्रति 1000", "service.orderThis": "यह सेवा ऑर्डर करें", "service.guaranteedPrompt": "गारंटी वाली सेवाएँ देखने के लिए प्लेटफ़ॉर्म चुनें:", "service.changePlatform": "← प्लेटफ़ॉर्म बदलें", "service.noGuaranteed": "इस प्लेटफ़ॉर्म के लिए अभी कोई गारंटी वाली सेवा उपलब्ध नहीं है", "service.allShort": "सभी", "service.guaranteedFor": "गारंटी वाली सेवाएँ:", "service.categoryDefault": "सामान्य",
    "service.all": "सभी", "service.platforms": "प्लेटफ़ॉर्म", "service.types": "सेवा प्रकार", "service.categories": "श्रेणियाँ", "service.search": "नाम या नंबर से सेवा खोजें...", "service.refresh": "रिफ्रेश", "service.available": "उपलब्ध सेवाएँ", "service.lastSync": "अंतिम अपडेट", "service.syncing": "कैटलॉग सिंक हो रहा है", "service.syncError": "कैटलॉग अपडेट नहीं हो सका", "service.guaranteed": "गारंटी वाली सेवाएँ", "service.guaranteedDesc": "चयनित सेवाएँ • ऑटो रीफिल • लाइफ़टाइम", "service.noResults": "कोई सेवा नहीं मिली", "service.addOrder": "ऑर्डर करें", "service.provider": "प्रदाता", "service.general": "सामान्य", "service.badge.guaranteed": "गारंटी", "service.badge.lifetime": "लाइफ़टाइम", "service.badge.instant": "तुरंत", "service.badge.refill": "ऑटो रीफिल",
    "platform.facebook": "Facebook", "platform.tiktok": "TikTok", "platform.instagram": "Instagram", "platform.whatsapp": "WhatsApp", "platform.twitter": "Twitter / X", "platform.youtube": "YouTube", "platform.telegram": "Telegram", "platform.discord": "Discord", "platform.snapchat": "Snapchat", "platform.threads": "Threads", "platform.twitch": "Twitch", "platform.kuaishou": "Kuaishou", "platform.likee": "Likee", "platform.spotify": "Spotify", "platform.other": "अन्य",
    "type.followers": "फ़ॉलोअर्स", "type.likes": "लाइक्स", "type.views": "व्यूज़", "type.comments": "कमेंट", "type.shares": "शेयर", "type.saves": "सेव", "type.votes": "वोट", "type.stories": "स्टोरीज़", "type.reels": "रील्स", "type.live": "लाइव", "type.other": "अन्य",
  },
};

export function translateServiceName(value: string, locale: Locale): string {
  const original = value.trim();
  const normalized = original.toLowerCase();
  const aliases: Record<string, string> = {
    followers: "type.followers", follower: "type.followers", متابع: "type.followers", متابعين: "type.followers", подписчики: "type.followers", подписчик: "type.followers", 팔로워: "type.followers", 粉丝: "type.followers", फ़ॉलोअर्स: "type.followers",
    likes: "type.likes", like: "type.likes", لايك: "type.likes", لايكات: "type.likes", лайки: "type.likes", 点赞: "type.likes", लाइक्स: "type.likes",
    views: "type.views", view: "type.views", مشاهدات: "type.views", مشاهدة: "type.views", просмотры: "type.views", 观看: "type.views", व्यूज़: "type.views",
    comments: "type.comments", comment: "type.comments", تعليقات: "type.comments", تعليق: "type.comments", комментарии: "type.comments", 评论: "type.comments", कमेंट: "type.comments",
    shares: "type.shares", share: "type.shares", مشاركات: "type.shares", مشاركة: "type.shares", репосты: "type.shares", 分享: "type.shares", शेयर: "type.shares",
    saves: "type.saves", save: "type.saves", حفظ: "type.saves", сохранения: "type.saves", 收藏: "type.saves", सेव: "type.saves",
    stories: "type.stories", story: "type.stories", ستوريات: "type.stories", сторис: "type.stories", 故事: "type.stories", स्टोरीज़: "type.stories",
    reels: "type.reels", ريلز: "type.reels", рилсы: "type.reels", 短视频: "type.reels", रील्स: "type.reels",
    live: "type.live", "بث مباشر": "type.live", بث: "type.live", "прямой эфир": "type.live", 直播: "type.live", लाइव: "type.live",
  };
  const exactKey = aliases[normalized];
  if (exactKey) return dictionaries[locale][exactKey] || common[exactKey] || original;

  const patterns: Array<[RegExp, string]> = [
    [/followers?|متابعين?|подписчик[ии]?|粉丝|फ़ॉलोअर्स/gi, "type.followers"],
    [/likes?|لايكات?|лайки|点赞|लाइक्स/gi, "type.likes"],
    [/views?|مشاهدات?|просмотр[ыа]?|观看|व्यूज़/gi, "type.views"],
    [/comments?|تعليقات?|комментарии|评论|कमेंट/gi, "type.comments"],
    [/shares?|مشاركات?|репосты|分享|शेयर/gi, "type.shares"],
    [/saves?|حفظ|сохранения|收藏|सेव/gi, "type.saves"],
    [/stories?|ستوريات?|сторис|故事|स्टори[ज़ज़]/gi, "type.stories"],
    [/reels?|ريلز|рилсы|短视频|रील्स/gi, "type.reels"],
    [/live|بث(?: مباشر)?|прямой эфир|直播|लाइव/gi, "type.live"],
  ];
  return patterns.reduce((result, [pattern, key]) => {
    const label = dictionaries[locale][key] || common[key];
    return label ? result.replace(pattern, label) : result;
  }, original);
}

export function translatePlatform(id: string, locale: Locale): string {
  return dictionaries[locale][`platform.${id}`] || common[`platform.${id}`] || id;
}

export function translateServiceType(id: string, locale: Locale): string {
  return dictionaries[locale][`type.${id}`] || common[`type.${id}`] || id;
}

export function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME) as Locale | null;
    if (saved && LOCALES.includes(saved) && saved !== locale) setLocaleState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = LOCALE_META[locale].dir;
    html.dataset.locale = locale;
    setCookie(COOKIE_NAME, locale);
  }, [locale]);

  const value = useMemo<LanguageContextType>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key: string) => dictionaries[locale]?.[key] ?? common[key] ?? key,
    isRTL: LOCALE_META[locale].dir === "rtl",
    localeMeta: LOCALE_META[locale],
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
