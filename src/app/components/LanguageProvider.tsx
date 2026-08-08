"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Locale = "ar" | "en";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const COOKIE_NAME = "smmnine-locale";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value};path=/;expires=${expires};SameSite=Lax`;
}

const dictionary: Record<Locale, Record<string, string>> = {
  ar: {
    "sidebar.menu": "القائمة",
    "sidebar.language": "اللغة",
    "sidebar.services": "الخدمات",
    "sidebar.orders": "طلباتي",
    "sidebar.actions": "إلغاء، تعويض، تسريع الطلبات",
    "sidebar.autoRefill": "التعبئة التلقائية",
    "sidebar.deposit": "شحن الرصيد",
    "sidebar.transactions": "سجل المعاملات",
    "sidebar.updates": "التحديثات",
    "sidebar.terms": "شروط الاستخدام",
    "sidebar.createSite": "أنشئ موقعك مجاناً",
    "sidebar.siteManagement": "إدارة موقعك",
    "sidebar.adminPanel": "لوحة الأدمن",
    "sidebar.logout": "تسجيل الخروج",
    "sidebar.close": "إغلاق",

    "language.title": "اختر اللغة",
    "language.ar": "العربية",
    "language.en": "English",

    "bottomNav.services": "خدمات",
    "bottomNav.deposit": "شحن الرصيد",
    "bottomNav.newOrder": "طلب جديد",
    "bottomNav.orders": "طلباتي",
    "bottomNav.support": "الدعم الفني",

    "header.notifications": "الإشعارات",
    "header.noNotifications": "لا توجد إشعارات",
    "header.menu": "القائمة",
    "header.profile": "الملف الشخصي",

    "dashboard.supportCenter": "مركز الدعم",
    "dashboard.supportCenterDesc": "اختر نوع الدعم الذي يناسبك — الدعم الفني للحالات العامة، أو الذكاء الاصطناعي لإجراءات فورية على طلباتك (تعويض، تسريع، إلغاء).",
    "dashboard.techSupport": "الدعم الفني",
    "dashboard.techSupportDesc": "لجميع الاستفسارات والمشاكل التي تحتاج لمراجعة بشرية من الفريق.",
    "dashboard.aiSupport": "دعم الذكاء الاصطناعي",
    "dashboard.aiSupportDesc": "إجراءات فورية على طلباتك — إلغاء، تسريع، تعويض دون انتظار.",
    "dashboard.previousTickets": "عرض تذاكري السابقة",
    "dashboard.whatsapp": "واتساب",
    "dashboard.telegram": "تيليجرام",
    "dashboard.support": "دعم",

    "common.loading": "جاري التحميل...",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.create": "إنشاء",
    "common.active": "نشط",
    "common.inactive": "غير نشط",
    "common.status": "الحالة",
  },
  en: {
    "sidebar.menu": "Menu",
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
    "language.ar": "العربية",
    "language.en": "English",

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
    "dashboard.supportCenterDesc": "Choose the support type that suits you — technical support for general cases, or AI for instant actions on your orders (refill, speed up, cancel).",
    "dashboard.techSupport": "Technical Support",
    "dashboard.techSupportDesc": "For all inquiries and issues that require human review from the team.",
    "dashboard.aiSupport": "AI Support",
    "dashboard.aiSupportDesc": "Instant actions on your orders — cancel, speed up, refill without waiting.",
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
  },
};

export function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME) as Locale | null;
    if (saved && saved !== locale && (saved === "ar" || saved === "en")) {
      setLocaleState(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === "ar" ? "rtl" : "ltr";
    setCookie(COOKIE_NAME, locale);
  }, [locale]);

  const setLocale = (value: Locale) => {
    setLocaleState(value);
  };

  const t = (key: string): string => {
    return dictionary[locale]?.[key] ?? dictionary.ar[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRTL: locale === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
