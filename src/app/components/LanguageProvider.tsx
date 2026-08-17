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

const COOKIE_NAME = "follower-locale";

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
    "language.subtitle": "سيُطبق التغيير على كامل المنصة",
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

    "order.all": "الكل",
    "order.pending": "معلق",
    "order.inProgress": "قيد التنفيذ",
    "order.partial": "جزئي",
    "order.completed": "مكتمل",
    "order.canceled": "ملغي",
    "order.failed": "فاشل",
    "order.refunded": "مسترد",
    "order.reviewing": "جاري المراجعة",
    "order.total": "الإجمالي",
    "order.search": "ابحث برقم الطلب أو اسم الخدمة...",
    "order.noOrders": "لا توجد طلبات",
    "order.units": "وحدة",
    "order.amount": "المبلغ",
    "order.quantity": "الكمية",
    "order.number": "رقم الطلب",
    "order.details": "تفاصيل الطلب",
    "order.service": "الخدمة",
    "order.remaining": "المتبقي",
    "order.startCount": "عند البداية",
    "order.track": "تتبع حالة الطلب",
    "order.noData": "—",
    "order.speed": "سريع",
    "order.slow": "بطيء",

    "ticket.myTickets": "تذاكري",
    "ticket.back": "رجوع لمركز الدعم",
    "ticket.noTickets": "لا توجد تذاكر بعد",
    "ticket.noTicketsDesc": "يمكنك إنشاء تذكرة جديدة من مركز الدعم",
    "ticket.status.open": "مفتوحة",
    "ticket.status.resolved": "تم الرد",
    "ticket.status.closed": "مغلقة",
    "ticket.status.replied": "تم الرد",
    "ticket.adminReply": "رد الإدارة",
    "ticket.orderNumber": "رقم الطلب",
    "ticket.created": "أنشئت في",
    "ticket.submit": "إرسال",
    "ticket.sent": "تم إرسال التذكرة",
    "ticket.willReply": "سنرد عليك في أقرب وقت",
    "ticket.replyWithin": "ستُنشأ تذكرة في قسم تذاكري ويردّ عليك الفريق خلال 24 ساعة.",
    "ticket.chooseType": "اختر نوع المشكلة",
    "ticket.title": "العنوان",
    "ticket.titlePh": "مثلاً: مشكلة في طلب زيادة متابعين",
    "ticket.orderId": "رقم الطلب (اختياري)",
    "ticket.orderIdPh": "12345",
    "ticket.describe": "صف مشكلتك بالتفصيل",
    "ticket.describePh": "اكتب وصفاً واضحاً للمشكلة — يمكنك ذكر رقم الطلب إن وُجد...",
    "ticket.selectFirst": "اختر نوع المشكلة أولاً",
    "ticket.type.speed_up": "تسريع طلب",
    "ticket.type.refill": "تعويض طلب",
    "ticket.type.recharge_issue": "مشكلة في الشحن",
    "ticket.type.cancel_order": "إلغاء طلب",
    "ticket.type.other": "مشكلة أخرى",
    "ticket.type.inquiry": "استفسار عام",
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
    "language.subtitle": "The change applies across the entire platform",
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
    "ticket.titlePh": "e.g.: Issue with a followers order",
    "ticket.orderId": "Order ID (optional)",
    "ticket.orderIdPh": "12345",
    "ticket.describe": "Describe your issue in detail",
    "ticket.describePh": "Write a clear description of the issue — you can mention the order ID if any...",
    "ticket.selectFirst": "Please choose the issue type first",
    "ticket.type.speed_up": "Speed Up Order",
    "ticket.type.refill": "Refill Order",
    "ticket.type.recharge_issue": "Deposit Issue",
    "ticket.type.cancel_order": "Cancel Order",
    "ticket.type.other": "Other Issue",
    "ticket.type.inquiry": "General Inquiry",
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
