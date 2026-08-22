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
  "sidebar.actions": "Cancel or Speed Up",
  "sidebar.deposit": "Deposit",
  "sidebar.transactions": "Transactions",
  "sidebar.updates": "Updates",
  "sidebar.terms": "Terms of Use",
  "sidebar.createSite": "Create Your Free Site",
  "sidebar.siteManagement": "Site Management",
  "sidebar.adminPanel": "Admin Panel",
  "sidebar.logout": "Logout",
  "sidebar.close": "Close",
  "sidebar.profile": "My Profile",
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
  "settings.accountTitle": "Account Settings",
  "settings.accountSubtitle": "Manage your profile, services, platforms, and account tools from one place.",
  "settings.profileCard": "Personal Profile",
  "settings.profileCardDesc": "View your username, role, balance, and account details.",
  "settings.languageCard": "Language",
  "settings.languageCardDesc": "Change the platform language and direction.",
  "settings.servicesCard": "My Services",
  "settings.servicesCardDesc": "Browse the platforms and services available to you.",
  "settings.ordersCard": "My Orders",
  "settings.ordersCardDesc": "Review order progress, status, and history.",
  "settings.apiCard": "API Access",
  "settings.apiCardDesc": "Manage your personal API keys and integrations.",
  "settings.transactionsCard": "Transactions",
  "settings.transactionsCardDesc": "Review wallet movements and balance activity.",
  "profile.title": "My Profile",
  "profile.subtitle": "Your personal account overview",
  "profile.username": "Username",
  "profile.email": "Email",
  "profile.role": "Account role",
  "profile.balance": "Wallet balance",
  "profile.availableTools": "Available tools",
  "profile.platforms": "Platforms and services",
  "profile.platformsDesc": "Explore the platforms and services you can use.",
  "profile.accountActions": "Account actions",
  "profile.accountActionsDesc": "Manage language, API access, transactions, and orders.",
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
  "order.stopped": "Stopped",
  "order.paused": "Paused",
  "order.tracking": "Track Order",
  "order.refresh": "Refresh",
  "order.refreshing": "Refreshing...",
  "order.progress": "Progress",
  "order.completedQuantity": "Completed",
  "order.provider": "Provider",
  "order.link": "Link",
  "order.lastUpdated": "Last updated",
  "order.cancelRequest": "Cancel order",
  "order.cancelConfirm": "The provider will be contacted first. Your balance is refunded only after cancellation is confirmed. Continue?",
  "order.cancelUnavailable": "This order cannot be canceled after execution has started or after completion.",
  "order.cancelNoRefund": "The provider did not confirm cancellation, so no balance was refunded.",
  "order.cancelSuccess": "Order canceled and balance refunded after provider confirmation.",
  "order.cancelRules": "Cancellation is available only while pending, under review, paused, or stopped. It is unavailable once work has started.",
  "order.trackHint": "Refresh to retrieve the latest progress from the provider.",
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
  "auth.verifyEmailTitle": "Verify your email",
};

const dictionaries: Record<Locale, Dictionary> = {
  en: common,
  ar: {
    ...common,
    "sidebar.menu": "القائمة", "sidebar.settings": "الإعدادات", "sidebar.language": "اللغة", "sidebar.services": "الخدمات", "sidebar.orders": "طلباتي", "sidebar.actions": "إلغاء أو تسريع الطلبات", "sidebar.deposit": "شحن الرصيد", "sidebar.transactions": "سجل المعاملات", "sidebar.updates": "التحديثات", "sidebar.terms": "شروط الاستخدام", "sidebar.createSite": "أنشئ موقعك مجاناً", "sidebar.siteManagement": "إدارة موقعك", "sidebar.adminPanel": "لوحة الأدمن", "sidebar.logout": "تسجيل الخروج", "sidebar.close": "إغلاق", "sidebar.profile": "ملفي الشخصي",
    "language.title": "اختر اللغة", "language.subtitle": "سيُطبق التغيير على كامل المنصة", "language.ar": "العربية", "language.en": "الإنجليزية", "language.ru": "الروسية", "language.zh": "الصينية", "language.hi": "الهندية",
    "settings.title": "الإعدادات", "settings.subtitle": "إدارة تفضيلات حسابك", "settings.languageTitle": "لغة المنصة", "settings.languageDescription": "اختر اللغة المستخدمة في جميع أجزاء المنصة.", "settings.languageSaved": "تم تحديث اللغة بنجاح", "settings.languageNote": "يُحفظ اختيارك تلقائيًا ويُطبق على جميع الصفحات.", "settings.accountTitle": "إعدادات الحساب", "settings.accountSubtitle": "أدر ملفك الشخصي وخدماتك ومنصاتك وأدوات حسابك من مكان واحد.", "settings.profileCard": "الملف الشخصي", "settings.profileCardDesc": "اعرض اسم المستخدم والدور والرصيد وتفاصيل الحساب.", "settings.languageCard": "اللغة", "settings.languageCardDesc": "غيّر لغة المنصة واتجاه الواجهة.", "settings.servicesCard": "خدماتي", "settings.servicesCardDesc": "تصفح المنصات والخدمات المتاحة لك.", "settings.ordersCard": "طلباتي", "settings.ordersCardDesc": "راجع تقدم الطلبات وحالاتها وسجلها.", "settings.apiCard": "بوابة API", "settings.apiCardDesc": "أدر مفاتيح API والربط الخاص بحسابك.", "settings.transactionsCard": "المعاملات", "settings.transactionsCardDesc": "راجع حركات المحفظة ونشاط الرصيد.", "profile.title": "ملفي الشخصي", "profile.subtitle": "نظرة عامة على حسابك الشخصي", "profile.username": "اسم المستخدم", "profile.email": "البريد الإلكتروني", "profile.role": "دور الحساب", "profile.balance": "رصيد المحفظة", "profile.availableTools": "الأدوات المتاحة", "profile.platforms": "المنصات والخدمات", "profile.platformsDesc": "استكشف المنصات والخدمات التي يمكنك استخدامها.", "profile.accountActions": "إجراءات الحساب", "profile.accountActionsDesc": "أدر اللغة والوصول إلى API والمعاملات والطلبات.",
    "auth.createAccount": "إنشاء حساب", "auth.backToLogin": "العودة لتسجيل الدخول", "auth.welcomeBack": "مرحبًا بعودتك", "auth.loginSubtitle": "أدخل بياناتك للدخول إلى حسابك", "auth.registerSubtitle": "سجّل حسابك الجديد وابدأ رحلتك معنا", "auth.username": "اسم المستخدم", "auth.usernamePlaceholder": "أدخل اسم المستخدم", "auth.email": "البريد الإلكتروني", "auth.password": "كلمة المرور", "auth.passwordHint": "8 أحرف على الأقل، تحتوي على حروف وأرقام", "auth.acceptTerms": "أوافق على شروط الاستخدام", "auth.compensationPolicy": "وسياسة التعويض. أقر بأنني قرأت شروط كل خدمة قبل الطلب.", "auth.terms": "شروط الاستخدام", "auth.login": "دخول", "auth.creating": "جاري الإنشاء...", "auth.loggingIn": "جاري الدخول...", "auth.noAccount": "ليس لديك حساب؟ سجّل الآن مجانًا", "auth.hasAccount": "لديك حساب؟ سجل الدخول", "auth.autoCrypto": "شحن تلقائي بالعملات", "auth.autoCryptoDesc": "شحن فوري عبر BSC / TRON وغيرها", "auth.instantExecution": "تنفيذ فوري", "auth.instantExecutionDesc": "طلباتك تبدأ خلال ثوانٍ معدودة", "status.platformOnline": "المنصة متاحة الآن", "status.offline": "تعذر الاتصال مؤقتًا", "status.checking": "جارٍ فحص الاتصال", "auth.passwordMinError": "كلمة المرور يجب أن تكون 8 أحرف على الأقل", "auth.passwordLetterError": "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل", "auth.passwordNumberError": "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل", "auth.emailRequired": "البريد الإلكتروني مطلوب", "auth.emailInvalid": "البريد الإلكتروني غير صالح", "auth.termsRequired": "يجب الموافقة على شروط الاستخدام", "auth.securityCodeTitle": "رمز الأمان الخاص بك", "auth.securityCodeDesc": "احفظ هذا الرمز في مكان آمن، لن يظهر لك مرة أخرى. ستحتاج إليه عند كل عملية دخول أو تغيير إعدادات الأمان.", "auth.continueToVerify": "متابعة للتحقق والدخول", "auth.verifyTitle": "التحقق الأمني", "auth.verifyDesc": "يرجى إدخال رمز الأمان المكون من 6 أرقام لمتابعة الدخول إلى حسابك.", "auth.securityCodeLabel": "رمز الأمان", "auth.confirmCode": "تأكيد الرمز", "auth.verifySuccess": "تم التحقق بنجاح، جارٍ التوجيه...", "auth.verifyEmailTitle": "تأكيد البريد الإلكتروني", "auth.lostCode": "إذا فقدت رمز الأمان الخاص بك، يرجى التواصل مع الدعم الفني لاستعادته.",
    "bottomNav.services": "خدمات", "bottomNav.deposit": "شحن الرصيد", "bottomNav.newOrder": "طلب جديد", "bottomNav.orders": "طلباتي", "bottomNav.support": "الدعم الفني",
    "header.notifications": "الإشعارات", "header.noNotifications": "لا توجد إشعارات", "header.menu": "القائمة", "header.profile": "الملف الشخصي",
    "dashboard.supportCenter": "مركز الدعم", "dashboard.supportCenterDesc": "اختر نوع الدعم الذي يناسبك — الدعم الفني للحالات العامة، أو الذكاء الاصطناعي لإجراءات فورية على طلباتك.", "dashboard.techSupport": "الدعم الفني", "dashboard.techSupportDesc": "لجميع الاستفسارات والمشاكل التي تحتاج لمراجعة بشرية من الفريق.", "dashboard.aiSupport": "دعم الذكاء الاصطناعي", "dashboard.aiSupportDesc": "إجراءات فورية على طلباتك — إلغاء، تسريع، أو تعويض.", "dashboard.previousTickets": "عرض تذاكري السابقة", "dashboard.whatsapp": "واتساب", "dashboard.telegram": "تيليجرام", "dashboard.support": "دعم",
    "common.loading": "جاري التحميل...", "common.save": "حفظ", "common.cancel": "إلغاء", "common.delete": "حذف", "common.create": "إنشاء", "common.active": "نشط", "common.inactive": "غير نشط", "common.status": "الحالة",
    "order.all": "الكل", "order.pending": "معلق", "order.inProgress": "قيد التنفيذ", "order.partial": "جزئي", "order.completed": "مكتمل", "order.canceled": "ملغي", "order.failed": "فاشل", "order.refunded": "مسترد", "order.reviewing": "جاري المراجعة", "order.stopped": "متوقف", "order.paused": "متوقف مؤقتًا", "order.total": "الإجمالي", "order.search": "ابحث برقم الطلب أو اسم الخدمة...", "order.noOrders": "لا توجد طلبات", "order.units": "وحدة", "order.amount": "المبلغ", "order.quantity": "الكمية", "order.number": "رقم الطلب", "order.details": "تفاصيل الطلب", "order.service": "الخدمة", "order.remaining": "المتبقي", "order.startCount": "عند البداية", "order.track": "متابعة الطلب", "order.speed": "سريع", "order.slow": "بطيء", "order.tracking": "متابعة الطلب", "order.refresh": "تحديث", "order.refreshing": "جارٍ التحديث...", "order.progress": "التقدم", "order.completedQuantity": "المنفذ", "order.provider": "المزود", "order.link": "الرابط", "order.lastUpdated": "آخر تحديث", "order.cancelRequest": "إلغاء الطلب", "order.cancelConfirm": "سيتم التواصل مع المزود أولًا، ولا يُعاد الرصيد إلا بعد تأكيد الإلغاء. هل تريد المتابعة؟", "order.cancelUnavailable": "لا يمكن إلغاء الطلب بعد بدء التنفيذ أو بعد اكتماله.", "order.cancelNoRefund": "لم يؤكد المزود الإلغاء، لذلك لم تتم إعادة الرصيد.", "order.cancelSuccess": "تم إلغاء الطلب وإعادة الرصيد بعد تأكيد المزود.", "order.cancelRules": "يتاح الإلغاء فقط عندما يكون الطلب معلقًا أو قيد المراجعة أو متوقفًا مؤقتًا أو متوقفًا. لا يتاح بعد بدء التنفيذ.", "order.trackHint": "حدّث البيانات لجلب آخر تقدم من المزود.",
    "ticket.myTickets": "تذاكري", "ticket.back": "رجوع لمركز الدعم", "ticket.noTickets": "لا توجد تذاكر بعد", "ticket.noTicketsDesc": "يمكنك إنشاء تذكرة جديدة من مركز الدعم", "ticket.status.open": "مفتوحة", "ticket.status.resolved": "تم الرد", "ticket.status.closed": "مغلقة", "ticket.status.replied": "تم الرد", "ticket.adminReply": "رد الإدارة", "ticket.orderNumber": "رقم الطلب", "ticket.created": "أنشئت في", "ticket.submit": "إرسال", "ticket.sent": "تم إرسال التذكرة", "ticket.willReply": "سنرد عليك في أقرب وقت", "ticket.replyWithin": "ستُنشأ تذكرة في قسم تذاكري ويردّ عليك الفريق خلال 24 ساعة.", "ticket.chooseType": "اختر نوع المشكلة", "ticket.title": "العنوان", "ticket.titlePh": "مثلاً: مشكلة في طلب زيادة متابعين", "ticket.orderId": "رقم الطلب (اختياري)", "ticket.describe": "صف مشكلتك بالتفصيل", "ticket.describePh": "اكتب وصفاً واضحاً للمشكلة...", "ticket.selectFirst": "اختر نوع المشكلة أولاً", "ticket.type.speed_up": "تسريع طلب", "ticket.type.refill": "تعويض طلب", "ticket.type.recharge_issue": "مشكلة في الشحن", "ticket.type.cancel_order": "إلغاء طلب", "ticket.type.other": "مشكلة أخرى", "ticket.type.inquiry": "استفسار عام",
    "service.title": "الخدمات", "service.subtitle": "اختر منصتك واعثر على الخدمة المثالية لنمو حسابك", "service.availableCount": "خدمة متاحة", "service.lastUpdatedPrefix": "آخر تحديث", "service.loadingError": "لم نتمكن من تحميل الخدمات", "service.retry": "إعادة المحاولة", "service.new": "جديد", "service.per1000": "لكل 1000", "service.orderThis": "اطلب هذه الخدمة", "service.guaranteedPrompt": "اختر المنصة التي تريد مشاهدة خدماتها المضمونة:", "service.changePlatform": "← تغيير المنصة", "service.noGuaranteed": "لا توجد خدمات مضمونة لهذه المنصة حاليًا", "service.allShort": "الكل", "service.guaranteedFor": "الخدمات المضمونة لـ", "service.categoryDefault": "عام",
    "service.all": "الكل", "service.platforms": "المنصات", "service.types": "أنواع الخدمات", "service.categories": "الفئات", "service.search": "ابحث عن خدمة بالاسم أو الرقم...", "service.refresh": "تحديث", "service.available": "خدمة متاحة", "service.lastSync": "آخر تحديث", "service.syncing": "جارٍ مزامنة الكتالوج", "service.syncError": "تعذر تحديث الكتالوج", "service.guaranteed": "الخدمات المضمونة", "service.guaranteedDesc": "خدمات مختارة بضمان • تعويض تلقائي • مدى الحياة", "service.noResults": "لا توجد خدمات", "service.addOrder": "اطلب الآن", "service.provider": "المزود", "service.general": "عام", "service.badge.guaranteed": "مضمونة", "service.badge.lifetime": "مدى الحياة", "service.badge.instant": "فورية", "service.badge.refill": "تعويض تلقائي",
    "platform.facebook": "فيسبوك", "platform.tiktok": "تيك توك", "platform.instagram": "إنستغرام", "platform.whatsapp": "واتساب", "platform.twitter": "إكس / تويتر", "platform.youtube": "يوتيوب", "platform.telegram": "تيليجرام", "platform.discord": "ديسكورد", "platform.snapchat": "سناب شات", "platform.threads": "ثريدز", "platform.twitch": "تويتش", "platform.kuaishou": "كواي", "platform.likee": "لايكي", "platform.spotify": "سبوتيفاي", "platform.other": "أخرى",
    "type.followers": "متابعين", "type.likes": "لايكات", "type.views": "مشاهدات", "type.comments": "تعليقات", "type.shares": "مشاركات", "type.saves": "حفظ", "type.votes": "تصويت", "type.stories": "ستوريات", "type.reels": "ريلز", "type.live": "بث مباشر", "type.other": "أخرى",
  },
  ru: {
    ...common,
    "sidebar.menu": "Меню", "sidebar.settings": "Настройки", "sidebar.language": "Язык", "sidebar.services": "Услуги", "sidebar.orders": "Мои заказы", "sidebar.actions": "Отмена или ускорение", "sidebar.deposit": "Пополнить баланс", "sidebar.transactions": "История операций", "sidebar.updates": "Обновления", "sidebar.terms": "Условия использования", "sidebar.createSite": "Создать сайт бесплатно", "sidebar.siteManagement": "Управление сайтом", "sidebar.adminPanel": "Панель администратора", "sidebar.logout": "Выйти", "sidebar.profile": "Мой профиль",
    "language.title": "Выберите язык", "language.subtitle": "Изменение применяется ко всей платформе", "language.ar": "Арабский", "language.en": "Английский", "language.ru": "Русский", "language.zh": "Китайский", "language.hi": "Хинди",
    "settings.title": "Настройки", "settings.subtitle": "Управление настройками аккаунта", "settings.languageTitle": "Язык платформы", "settings.languageDescription": "Выберите язык для всей платформы.", "settings.languageSaved": "Язык успешно обновлён", "settings.languageNote": "Выбор сохраняется автоматически и применяется на всех страницах.", "settings.accountTitle": "Настройки аккаунта", "settings.accountSubtitle": "Управляйте профилем, услугами, платформами и инструментами аккаунта в одном месте.", "settings.profileCard": "Личный профиль", "settings.profileCardDesc": "Просматривайте имя пользователя, роль, баланс и данные аккаунта.", "settings.languageCard": "Язык", "settings.languageCardDesc": "Измените язык и направление интерфейса.", "settings.servicesCard": "Мои услуги", "settings.servicesCardDesc": "Просматривайте доступные платформы и услуги.", "settings.ordersCard": "Мои заказы", "settings.ordersCardDesc": "Проверяйте прогресс, статусы и историю заказов.", "settings.apiCard": "Доступ к API", "settings.apiCardDesc": "Управляйте API-ключами и интеграциями аккаунта.", "settings.transactionsCard": "Операции", "settings.transactionsCardDesc": "Просматривайте движения кошелька и баланс.", "profile.title": "Мой профиль", "profile.subtitle": "Обзор личного аккаунта", "profile.username": "Имя пользователя", "profile.email": "Электронная почта", "profile.role": "Роль аккаунта", "profile.balance": "Баланс кошелька", "profile.availableTools": "Доступные инструменты", "profile.platforms": "Платформы и услуги", "profile.platformsDesc": "Изучите платформы и услуги, которыми вы можете пользоваться.", "profile.accountActions": "Действия аккаунта", "profile.accountActionsDesc": "Управляйте языком, API, операциями и заказами.",
    "auth.createAccount": "Создать аккаунт", "auth.backToLogin": "Вернуться ко входу", "auth.welcomeBack": "С возвращением", "auth.loginSubtitle": "Введите данные для доступа к аккаунту", "auth.registerSubtitle": "Создайте аккаунт и начните пользоваться платформой", "auth.username": "Имя пользователя", "auth.usernamePlaceholder": "Введите имя пользователя", "auth.email": "Электронная почта", "auth.password": "Пароль", "auth.passwordHint": "Не менее 8 символов, включая буквы и цифры", "auth.acceptTerms": "Я принимаю условия использования", "auth.compensationPolicy": "и политику компенсаций. Я прочитал условия каждой услуги.", "auth.terms": "Условия использования", "auth.login": "Войти", "auth.creating": "Создание...", "auth.loggingIn": "Вход...", "auth.noAccount": "Нет аккаунта? Зарегистрируйтесь бесплатно", "auth.hasAccount": "Уже есть аккаунт? Войти", "auth.autoCrypto": "Автоматическое криптопополнение", "auth.autoCryptoDesc": "Мгновенное пополнение через BSC / TRON и другие сети", "auth.instantExecution": "Мгновенное выполнение", "auth.instantExecutionDesc": "Ваши заказы начнутся в течение секунд", "status.platformOnline": "Платформа доступна", "status.offline": "Временно недоступно", "status.checking": "Проверка соединения", "auth.passwordMinError": "Пароль должен содержать не менее 8 символов", "auth.passwordLetterError": "Пароль должен содержать хотя бы одну букву", "auth.passwordNumberError": "Пароль должен содержать хотя бы одну цифру", "auth.emailRequired": "Введите электронную почту", "auth.emailInvalid": "Неверный адрес электронной почты", "auth.termsRequired": "Необходимо принять условия использования",
    "bottomNav.services": "Услуги", "bottomNav.deposit": "Пополнить", "bottomNav.newOrder": "Новый заказ", "bottomNav.orders": "Заказы", "bottomNav.support": "Поддержка", "header.notifications": "Уведомления", "header.noNotifications": "Нет уведомлений", "header.menu": "Меню", "header.profile": "Профиль",
    "common.loading": "Загрузка...", "common.save": "Сохранить", "common.cancel": "Отмена", "common.delete": "Удалить", "common.create": "Создать", "common.active": "Активен", "common.inactive": "Неактивен", "common.status": "Статус",
    "order.all": "Все", "order.pending": "Ожидает", "order.inProgress": "Выполняется", "order.partial": "Частично", "order.completed": "Завершён", "order.canceled": "Отменён", "order.failed": "Ошибка", "order.refunded": "Возврат", "order.reviewing": "На проверке", "order.stopped": "Остановлен", "order.paused": "Приостановлен", "order.total": "Всего", "order.search": "Поиск по номеру заказа или названию услуги...", "order.noOrders": "Заказов нет", "order.units": "ед.", "order.amount": "Сумма", "order.quantity": "Количество", "order.number": "Номер заказа", "order.details": "Детали заказа", "order.service": "Услуга", "order.remaining": "Осталось", "order.startCount": "Начальное значение", "order.track": "Отследить заказ", "order.speed": "Быстро", "order.slow": "Медленно", "order.tracking": "Отслеживание заказа", "order.refresh": "Обновить", "order.refreshing": "Обновление...", "order.progress": "Прогресс", "order.completedQuantity": "Выполнено", "order.provider": "Провайдер", "order.link": "Ссылка", "order.lastUpdated": "Последнее обновление", "order.cancelRequest": "Отменить заказ", "order.cancelConfirm": "Сначала будет отправлен запрос провайдеру. Баланс вернётся только после подтверждения отмены. Продолжить?", "order.cancelUnavailable": "Заказ нельзя отменить после начала выполнения или завершения.", "order.cancelNoRefund": "Провайдер не подтвердил отмену, поэтому баланс не возвращён.", "order.cancelSuccess": "Заказ отменён, баланс возвращён после подтверждения провайдера.", "order.cancelRules": "Отмена доступна только для ожидающих, проверяемых, приостановленных или остановленных заказов. После начала выполнения она недоступна.", "order.trackHint": "Обновите данные, чтобы получить последний прогресс от провайдера.",
    "ticket.myTickets": "Мои тикеты", "ticket.back": "Вернуться в поддержку", "ticket.noTickets": "Тикетов пока нет", "ticket.noTicketsDesc": "Создайте новый тикет в центре поддержки", "ticket.status.open": "Открыт", "ticket.status.resolved": "Отвечен", "ticket.status.closed": "Закрыт", "ticket.submit": "Отправить", "ticket.sent": "Тикет отправлен", "ticket.willReply": "Мы ответим как можно скорее", "ticket.chooseType": "Выберите тип проблемы", "ticket.title": "Заголовок", "ticket.orderId": "Номер заказа (необязательно)", "ticket.describe": "Опишите проблему подробно", "ticket.selectFirst": "Сначала выберите тип проблемы", "ticket.type.speed_up": "Ускорить заказ", "ticket.type.refill": "Пополнить заказ", "ticket.type.recharge_issue": "Проблема с пополнением", "ticket.type.cancel_order": "Отменить заказ", "ticket.type.other": "Другая проблема", "ticket.type.inquiry": "Общий вопрос",
    "service.title": "Услуги", "service.subtitle": "Выберите платформу и найдите идеальную услугу для роста аккаунта", "service.availableCount": "доступных услуг", "service.lastUpdatedPrefix": "Последнее обновление", "service.loadingError": "Не удалось загрузить услуги", "service.retry": "Повторить", "service.new": "Новое", "service.per1000": "за 1000", "service.orderThis": "Заказать эту услугу", "service.guaranteedPrompt": "Выберите платформу, чтобы посмотреть услуги с гарантией:", "service.changePlatform": "← Изменить платформу", "service.noGuaranteed": "Для этой платформы сейчас нет услуг с гарантией", "service.allShort": "Все", "service.guaranteedFor": "Услуги с гарантией для", "service.categoryDefault": "Общее",
    "service.all": "Все", "service.platforms": "Платформы", "service.types": "Типы услуг", "service.categories": "Категории", "service.search": "Поиск услуги по названию или номеру...", "service.refresh": "Обновить", "service.available": "доступных услуг", "service.lastSync": "Последнее обновление", "service.syncing": "Синхронизация каталога", "service.syncError": "Не удалось обновить каталог", "service.guaranteed": "Гарантированные услуги", "service.guaranteedDesc": "Выбранные услуги с гарантией • автопополнение • пожизненно", "service.noResults": "Услуги не найдены", "service.addOrder": "Заказать", "service.provider": "Провайдер", "service.general": "Общее", "service.badge.guaranteed": "Гарантия", "service.badge.lifetime": "Пожизненно", "service.badge.instant": "Мгновенно", "service.badge.refill": "Автопополнение",
    "platform.facebook": "Facebook", "platform.tiktok": "TikTok", "platform.instagram": "Instagram", "platform.whatsapp": "WhatsApp", "platform.twitter": "Twitter / X", "platform.youtube": "YouTube", "platform.telegram": "Telegram", "platform.discord": "Discord", "platform.snapchat": "Snapchat", "platform.threads": "Threads", "platform.twitch": "Twitch", "platform.kuaishou": "Kuaishou", "platform.likee": "Likee", "platform.spotify": "Spotify", "platform.other": "Другое",
    "type.followers": "Подписчики", "type.likes": "Лайки", "type.views": "Просмотры", "type.comments": "Комментарии", "type.shares": "Репосты", "type.saves": "Сохранения", "type.votes": "Голоса", "type.stories": "Истории", "type.reels": "Рилсы", "type.live": "Прямой эфир", "type.other": "Другое",
  },
  zh: {
    ...common,
    "sidebar.menu": "菜单", "sidebar.settings": "设置", "sidebar.language": "语言", "sidebar.services": "服务", "sidebar.orders": "我的订单", "sidebar.actions": "取消或加速", "sidebar.deposit": "充值", "sidebar.transactions": "交易记录", "sidebar.updates": "更新", "sidebar.terms": "使用条款", "sidebar.createSite": "免费创建网站", "sidebar.siteManagement": "网站管理", "sidebar.adminPanel": "管理面板", "sidebar.logout": "退出登录", "sidebar.profile": "我的资料",
    "language.title": "选择语言", "language.subtitle": "更改将应用于整个平台注册", "language.ar": "阿拉伯语", "language.en": "英语", "language.ru": "俄语", "language.zh": "中文", "language.hi": "印地语",
    "settings.title": "设置", "settings.subtitle": "管理您的账户偏好", "settings.languageTitle": "平台语言", "settings.languageDescription": "选择整个平台使用的语言。", "settings.languageSaved": "语言更新成功", "settings.languageNote": "您的选择会自动保存，并应用于所有页面。", "settings.accountTitle": "账户设置", "settings.accountSubtitle": "在一个地方管理您的资料、服务、平台和账户工具。", "settings.profileCard": "个人资料", "settings.profileCardDesc": "查看用户名、角色、余额和账户详情。", "settings.languageCard": "语言", "settings.languageCardDesc": "更改平台语言和界面方向。", "settings.servicesCard": "我的服务", "settings.servicesCardDesc": "浏览您可以使用的平台和服务。", "settings.ordersCard": "我的订单", "settings.ordersCardDesc": "查看订单进度、状态和历史记录。", "settings.apiCard": "API 访问", "settings.apiCardDesc": "管理个人 API 密钥和集成。", "settings.transactionsCard": "交易记录", "settings.transactionsCardDesc": "查看钱包变动和余额活动。", "profile.title": "我的资料", "profile.subtitle": "个人账户概览", "profile.username": "用户名", "profile.email": "电子邮箱", "profile.role": "账户角色", "profile.balance": "钱包余额", "profile.availableTools": "可用工具", "profile.platforms": "平台和服务", "profile.platformsDesc": "探索您可以使用的平台和服务。", "profile.accountActions": "账户操作", "profile.accountActionsDesc": "管理语言、API 访问、交易和订单。",
    "auth.createAccount": "创建账户", "auth.backToLogin": "返回登录", "auth.welcomeBack": "欢迎回来", "auth.loginSubtitle": "输入信息以访问您的账户", "auth.registerSubtitle": "创建账户，开启您的旅程", "auth.username": "用户名", "auth.usernamePlaceholder": "输入用户名", "auth.email": "电子邮箱", "auth.password": "密码", "auth.passwordHint": "至少8个字符，包含字母和数字", "auth.acceptTerms": "我同意使用条款", "auth.compensationPolicy": "和补偿政策。我确认已阅读每项服务的条款。", "auth.terms": "使用条款", "auth.login": "登录", "auth.creating": "创建中...", "auth.loggingIn": "正在登录...", "auth.noAccount": "还没有账户？免费注册", "auth.hasAccount": "已有账户？登录", "auth.autoCrypto": "自动加密货币充值", "auth.autoCryptoDesc": "支持 BSC / TRON 等网络即时充值", "auth.instantExecution": "即时执行", "auth.instantExecutionDesc": "您的订单将在几秒内开始", "status.platformOnline": "平台在线", "status.offline": "暂时无法连接", "status.checking": "正在检查连接", "auth.passwordMinError": "密码至少需要8个字符", "auth.passwordLetterError": "密码必须包含至少一个字母", "auth.passwordNumberError": "密码必须包含至少一个数字", "auth.emailRequired": "请输入电子邮箱", "auth.emailInvalid": "电子邮箱格式无效", "auth.termsRequired": "请同意使用条款",
    "bottomNav.services": "服务", "bottomNav.deposit": "充值", "bottomNav.newOrder": "新订单", "bottomNav.orders": "订单", "bottomNav.support": "支持", "header.notifications": "通知", "header.noNotifications": "暂无通知", "header.menu": "菜单", "header.profile": "个人资料",
    "common.loading": "加载中...", "common.save": "保存", "common.cancel": "取消", "common.delete": "删除", "common.create": "创建", "common.active": "启用", "common.inactive": "停用", "common.status": "状态",
    "order.all": "全部", "order.pending": "待处理", "order.inProgress": "进行中", "order.partial": "部分完成", "order.completed": "已完成", "order.canceled": "已取消", "order.failed": "失败", "order.refunded": "已退款", "order.reviewing": "审核中", "order.stopped": "已停止", "order.paused": "已暂停", "order.total": "总计", "order.search": "按订单号或服务名称搜索...", "order.noOrders": "暂无订单", "order.units": "单位", "order.amount": "金额", "order.quantity": "数量", "order.number": "订单号", "order.details": "订单详情", "order.service": "服务", "order.remaining": "剩余", "order.startCount": "起始数量", "order.track": "跟踪订单", "order.speed": "快速", "order.slow": "慢速", "order.tracking": "订单跟踪", "order.refresh": "刷新", "order.refreshing": "正在刷新...", "order.progress": "进度", "order.completedQuantity": "已完成", "order.provider": "供应商", "order.link": "链接", "order.lastUpdated": "最后更新", "order.cancelRequest": "取消订单", "order.cancelConfirm": "系统将先联系供应商，只有在确认取消后才会退还余额。是否继续？", "order.cancelUnavailable": "订单开始执行或完成后无法取消。", "order.cancelNoRefund": "供应商未确认取消，因此余额未退还。", "order.cancelSuccess": "供应商确认后，订单已取消并退还余额。", "order.cancelRules": "只有待处理、审核中、暂停或已停止的订单可以取消。开始执行后不可取消。", "order.trackHint": "刷新以获取供应商的最新进度。",
    "ticket.myTickets": "我的工单", "ticket.back": "返回支持中心", "ticket.noTickets": "暂无工单", "ticket.noTicketsDesc": "您可以从支持中心创建新工单", "ticket.status.open": "开放", "ticket.status.resolved": "已回复", "ticket.status.closed": "已关闭", "ticket.submit": "提交", "ticket.sent": "工单已提交", "ticket.willReply": "我们会尽快回复", "ticket.chooseType": "选择问题类型", "ticket.title": "标题", "ticket.orderId": "订单号（可选）", "ticket.describe": "详细描述问题", "ticket.selectFirst": "请先选择问题类型", "ticket.type.speed_up": "加速订单", "ticket.type.refill": "补发订单", "ticket.type.recharge_issue": "充值问题", "ticket.type.cancel_order": "取消订单", "ticket.type.other": "其他问题", "ticket.type.inquiry": "一般咨询",
    "service.title": "服务", "service.subtitle": "选择平台，找到适合账号增长的服务", "service.availableCount": "项可用服务", "service.lastUpdatedPrefix": "最后更新", "service.loadingError": "无法加载服务", "service.retry": "重试", "service.new": "新品", "service.per1000": "每1000", "service.orderThis": "立即下单", "service.guaranteedPrompt": "选择要查看保障服务的平台：", "service.changePlatform": "← 更换平台", "service.noGuaranteed": "该平台目前没有可用的保障服务", "service.allShort": "全部", "service.guaranteedFor": "保障服务：", "service.categoryDefault": "一般",
    "service.all": "全部", "service.platforms": "平台", "service.types": "服务类型", "service.categories": "分类", "service.search": "按名称或编号搜索服务...", "service.refresh": "刷新", "service.available": "项可用服务", "service.lastSync": "最后更新", "service.syncing": "正在同步目录", "service.syncError": "无法更新目录", "service.guaranteed": "有保障的服务", "service.guaranteedDesc": "精选服务 • 自动补发 • 终身保障", "service.noResults": "未找到服务", "service.addOrder": "立即下单", "service.provider": "供应商", "service.general": "一般", "service.badge.guaranteed": "有保障", "service.badge.lifetime": "终身", "service.badge.instant": "即时", "service.badge.refill": "自动补发",
    "platform.facebook": "Facebook", "platform.tiktok": "TikTok", "platform.instagram": "Instagram", "platform.whatsapp": "WhatsApp", "platform.twitter": "Twitter / X", "platform.youtube": "YouTube", "platform.telegram": "Telegram", "platform.discord": "Discord", "platform.snapchat": "Snapchat", "platform.threads": "Threads", "platform.twitch": "Twitch", "platform.kuaishou": "快手", "platform.likee": "Likee", "platform.spotify": "Spotify", "platform.other": "其他",
    "type.followers": "粉丝", "type.likes": "点赞", "type.views": "观看", "type.comments": "评论", "type.shares": "分享", "type.saves": "收藏", "type.votes": "投票", "type.stories": "动态", "type.reels": "短视频", "type.live": "直播", "type.other": "其他",
  },
  hi: {
    ...common,
    "sidebar.menu": "मेनू", "sidebar.settings": "सेटिंग्स", "sidebar.language": "भाषा", "sidebar.services": "सेवाएँ", "sidebar.orders": "मेरे ऑर्डर", "sidebar.actions": "रद्द या तेज़ करें", "sidebar.deposit": "बैलेंस जमा करें", "sidebar.transactions": "लेन-देन इतिहास", "sidebar.updates": "अपडेट", "sidebar.terms": "उपयोग की शर्तें", "sidebar.createSite": "मुफ़्त साइट बनाएँ", "sidebar.siteManagement": "साइट प्रबंधन", "sidebar.adminPanel": "एडमिन पैनल", "sidebar.logout": "लॉग आउट", "sidebar.profile": "मेरी प्रोफ़ाइल",
    "language.title": "भाषा चुनें", "language.subtitle": "बदलाव पूरे प्लेटफ़ॉर्म पर लागू होगा", "language.ar": "अरबी", "language.en": "अंग्रेज़ी", "language.ru": "रूसी", "language.zh": "चीनी", "language.hi": "हिन्दी",
    "settings.title": "सेटिंग्स", "settings.subtitle": "अपने खाते की प्राथमिकताएँ प्रबंधित करें", "settings.languageTitle": "प्लेटफ़ॉर्म की भाषा", "settings.languageDescription": "पूरे प्लेटफ़ॉर्म में उपयोग की जाने वाली भाषा चुनें।", "settings.languageSaved": "भाषा सफलतापूर्वक अपडेट हुई", "settings.languageNote": "आपका चयन अपने आप सहेजा जाएगा और सभी पृष्ठों पर लागू होगा।", "settings.accountTitle": "खाता सेटिंग्स", "settings.accountSubtitle": "अपनी प्रोफ़ाइल, सेवाओं, प्लेटफ़ॉर्म और खाता टूल एक ही जगह प्रबंधित करें।", "settings.profileCard": "व्यक्तिगत प्रोफ़ाइल", "settings.profileCardDesc": "उपयोगकर्ता नाम, भूमिका, बैलेंस और खाते का विवरण देखें।", "settings.languageCard": "भाषा", "settings.languageCardDesc": "प्लेटफ़ॉर्म की भाषा और इंटरफ़ेस दिशा बदलें।", "settings.servicesCard": "मेरी सेवाएँ", "settings.servicesCardDesc": "अपने लिए उपलब्ध प्लेटफ़ॉर्म और सेवाएँ देखें।", "settings.ordersCard": "मेरे ऑर्डर", "settings.ordersCardDesc": "ऑर्डर की प्रगति, स्थिति और इतिहास देखें।", "settings.apiCard": "API एक्सेस", "settings.apiCardDesc": "अपनी API कुंजियाँ और इंटीग्रेशन प्रबंधित करें।", "settings.transactionsCard": "लेन-देन", "settings.transactionsCardDesc": "वॉलेट गतिविधि और बैलेंस देखें।", "profile.title": "मेरी प्रोफ़ाइल", "profile.subtitle": "आपके व्यक्तिगत खाते का अवलोकन", "profile.username": "उपयोगकर्ता नाम", "profile.email": "ईमेल", "profile.role": "खाते की भूमिका", "profile.balance": "वॉलेट बैलेंस", "profile.availableTools": "उपलब्ध टूल", "profile.platforms": "प्लेटफ़ॉर्म और सेवाएँ", "profile.platformsDesc": "उन प्लेटफ़ॉर्म और सेवाओं को देखें जिनका आप उपयोग कर सकते हैं।", "profile.accountActions": "खाता कार्रवाई", "profile.accountActionsDesc": "भाषा, API एक्सेस, लेन-देन और ऑर्डर प्रबंधित करें।",
    "auth.createAccount": "खाता बनाएँ", "auth.backToLogin": "लॉगिन पर वापस जाएँ", "auth.welcomeBack": "वापसी पर स्वागत है", "auth.loginSubtitle": "अपने खाते में प्रवेश करने के लिए विवरण दर्ज करें", "auth.registerSubtitle": "अपना खाता बनाएँ और यात्रा शुरू करें", "auth.username": "उपयोगकर्ता नाम", "auth.usernamePlaceholder": "उपयोगकर्ता नाम दर्ज करें", "auth.email": "ईमेल पता", "auth.password": "पासवर्ड", "auth.passwordHint": "कम से कम 8 अक्षर, जिनमें अक्षर और अंक हों", "auth.acceptTerms": "मैं उपयोग की शर्तों से सहमत हूँ", "auth.compensationPolicy": "और मुआवज़ा नीति से। मैंने हर सेवा की शर्तें पढ़ ली हैं।", "auth.terms": "उपयोग की शर्तें", "auth.login": "लॉगिन", "auth.creating": "बनाया जा रहा है...", "auth.loggingIn": "लॉगिन हो रहा है...", "auth.noAccount": "खाता नहीं है? मुफ़्त साइन अप करें", "auth.hasAccount": "पहले से खाता है? लॉगिन करें", "auth.autoCrypto": "स्वचालित क्रिप्टो जमा", "auth.autoCryptoDesc": "BSC / TRON और अन्य नेटवर्क से तुरंत जमा", "auth.instantExecution": "तुरंत निष्पादन", "auth.instantExecutionDesc": "आपके ऑर्डर कुछ ही सेकंड में शुरू होंगे", "status.platformOnline": "प्लेटफ़ॉर्म ऑनलाइन है", "status.offline": "अस्थायी रूप से अनुपलब्ध", "status.checking": "कनेक्शन जाँचा जा रहा है", "auth.passwordMinError": "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए", "auth.passwordLetterError": "पासवर्ड में कम से कम एक अक्षर होना चाहिए", "auth.passwordNumberError": "पासवर्ड में कम से कम एक अंक होना चाहिए", "auth.emailRequired": "ईमेल आवश्यक है", "auth.emailInvalid": "अमान्य ईमेल पता", "auth.termsRequired": "आपको उपयोग की शर्तें स्वीकार करनी होंगी",
    "bottomNav.services": "सेवाएँ", "bottomNav.deposit": "जमा करें", "bottomNav.newOrder": "नया ऑर्डर", "bottomNav.orders": "ऑर्डर", "bottomNav.support": "सहायता", "header.notifications": "सूचनाएँ", "header.noNotifications": "कोई सूचना नहीं", "header.menu": "मेनू", "header.profile": "प्रोफ़ाइल",
    "common.loading": "लोड हो रहा है...", "common.save": "सहेजें", "common.cancel": "रद्द करें", "common.delete": "हटाएँ", "common.create": "बनाएँ", "common.active": "सक्रिय", "common.inactive": "निष्क्रिय", "common.status": "स्थिति",
    "order.all": "सभी", "order.pending": "लंबित", "order.inProgress": "प्रगति में", "order.partial": "आंशिक", "order.completed": "पूर्ण", "order.canceled": "रद्द", "order.failed": "विफल", "order.refunded": "वापस किया गया", "order.reviewing": "समीक्षा में", "order.stopped": "रुका हुआ", "order.paused": "रुका हुआ", "order.total": "कुल", "order.search": "ऑर्डर नंबर या सेवा नाम से खोजें...", "order.noOrders": "कोई ऑर्डर नहीं", "order.units": "यूनिट", "order.amount": "राशि", "order.quantity": "मात्रा", "order.number": "ऑर्डर आईडी", "order.details": "ऑर्डर विवरण", "order.service": "सेवा", "order.remaining": "शेष", "order.startCount": "प्रारंभिक संख्या", "order.track": "ऑर्डर ट्रैक करें", "order.speed": "तेज़", "order.slow": "धीमा", "order.tracking": "ऑर्डर ट्रैकिंग", "order.refresh": "रिफ्रेश", "order.refreshing": "रिफ्रेश हो रहा है...", "order.progress": "प्रगति", "order.completedQuantity": "पूर्ण", "order.provider": "प्रदाता", "order.link": "लिंक", "order.lastUpdated": "अंतिम अपडेट", "order.cancelRequest": "ऑर्डर रद्द करें", "order.cancelConfirm": "पहले प्रदाता से रद्द करने का अनुरोध भेजा जाएगा। पुष्टि के बाद ही बैलेंस वापस होगा। जारी रखें?", "order.cancelUnavailable": "काम शुरू होने या पूरा होने के बाद ऑर्डर रद्द नहीं किया जा सकता।", "order.cancelNoRefund": "प्रदाता ने रद्दीकरण की पुष्टि नहीं की, इसलिए बैलेंस वापस नहीं किया गया।", "order.cancelSuccess": "प्रदाता की पुष्टि के बाद ऑर्डर रद्द हुआ और बैलेंस वापस कर दिया गया।", "order.cancelRules": "केवल लंबित, समीक्षा में, रुके या स्थगित ऑर्डर रद्द किए जा सकते हैं। काम शुरू होने के बाद रद्दीकरण उपलब्ध नहीं है।", "order.trackHint": "प्रदाता की नवीनतम प्रगति पाने के लिए रिफ्रेश करें।",
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
    if (saved && LOCALES.includes(saved) && saved !== locale) {
      window.setTimeout(() => setLocaleState(saved), 0);
    }
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
