"use client";


import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  X,
  User,
  Boxes,
  ShoppingCart,
  Zap,
  Wallet,
  History,
  Bell,
  ClipboardList,
  Globe2,
  SlidersHorizontal,
  LogOut,
  Shield,
  FileText,
  KeyRound,
  Settings,
  Gift,
  Star,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { clearAuthBootstrap } from "./auth-client";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: { username: string; balance: number; role: string } | null;
}

type MenuItem =
  | { type: "link"; label: string; description?: string; href: string; icon?: React.ElementType; badge?: string; badgeColor?: string }
  | { type: "action"; label: string; description?: string; action: () => void; icon?: React.ElementType; badge?: string; badgeColor?: string };

type CustomNavItem = {
  id: number;
  label_ar: string;
  label_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  href: string;
  icon: string;
  badge: string | null;
  badge_color: string;
  audience: "user" | "admin" | "both";
  is_active: number;
  sort_order: number;
};

const customIconMap: Record<string, React.ElementType> = {
  Zap,
  Globe2,
  Gift,
  Wallet,
  ShoppingCart,
  Boxes,
  Bell,
  FileText,
  KeyRound,
  Star,
  Sparkles,
};

function parseCustomItems(value: unknown): CustomNavItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CustomNavItem[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = Number(row.id);
    const href = String(row.href || "");
    const audience = String(row.audience || "user");
    if (!Number.isInteger(id) || id <= 0 || !href.startsWith("/") || !["user", "admin", "both"].includes(audience)) return [];
    return [{
      id,
      label_ar: String(row.label_ar || ""),
      label_en: row.label_en == null ? null : String(row.label_en),
      description_ar: row.description_ar == null ? null : String(row.description_ar),
      description_en: row.description_en == null ? null : String(row.description_en),
      href,
      icon: String(row.icon || "Zap"),
      badge: row.badge == null ? null : String(row.badge),
      badge_color: String(row.badge_color || "gold"),
      audience: audience as CustomNavItem["audience"],
      is_active: Number(row.is_active ?? 1),
      sort_order: Number(row.sort_order ?? 0),
    }];
  });
}

export default function Sidebar({ open, onClose, user }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  const [customItems, setCustomItems] = useState<CustomNavItem[]>([]);
  const [adminCustomItems, setAdminCustomItems] = useState<CustomNavItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadCustomNavigation = async () => {
      try {
        const publicResponse = await fetch("/api/navigation", { cache: "no-store" });
        const publicData = await publicResponse.json() as { items?: unknown };
        if (!cancelled) setCustomItems(parseCustomItems(publicData.items).filter((item) => item.is_active === 1 && (item.audience === "user" || item.audience === "both")));
        if (user?.role === "admin") {
          const adminResponse = await fetch("/api/admin/navigation", { cache: "no-store" });
          if (adminResponse.ok) {
            const adminData = await adminResponse.json() as { items?: unknown };
            if (!cancelled) setAdminCustomItems(parseCustomItems(adminData.items).filter((item) => item.is_active === 1 && (item.audience === "admin" || item.audience === "both")));
          }
        } else if (!cancelled) {
          setAdminCustomItems([]);
        }
      } catch {
        if (!cancelled) {
          setCustomItems([]);
          setAdminCustomItems([]);
        }
      }
    };
    void loadCustomNavigation();
    return () => { cancelled = true; };
  }, [user?.role]);

  const customLabel = (item: CustomNavItem) => locale === "ar" ? item.label_ar : (item.label_en || item.label_ar);
  const customDescription = (item: CustomNavItem) => locale === "ar" ? (item.description_ar || item.description_en) : (item.description_en || item.description_ar);
  const customBadgeClass = (color: string) => color === "green" ? "bg-green-500/20 text-green-400" : color === "blue" ? "bg-blue-500/20 text-blue-300" : color === "red" ? "bg-red-500/20 text-red-300" : "badge-new";
  const sidebarDescriptions: Record<string, Record<string, string>> = {
    ar: {
      dashboard: "العودة إلى لوحة الحساب", profile: "عرض بيانات الحساب والأدوات", language: "اختيار لغة المنصة واتجاهها", settings: "إدارة تفضيلات الحساب", security: "إدارة حماية الحساب ورمز الأمان", services: "تصفح الخدمات واختر المناسب", free: "استخدم العروض المجانية المتاحة", orders: "متابعة الطلبات وحالتها", actions: "إلغاء أو تسريع أو تعبئة الطلب", deposit: "إضافة رصيد إلى المحفظة", api: "إدارة المفتاح وربط التطبيقات", transactions: "مراجعة حركات الرصيد", updates: "آخر أخبار وتحديثات المنصة", terms: "شروط الاستخدام والسياسات", createSite: "إنشاء موقع خدمات مجاني", siteManagement: "إدارة الموقع والخدمات", adminPanel: "نظرة عامة وتنبيهات التشغيل", adminOrders: "مراجعة الطلبات وحالاتها", adminUsers: "إدارة الحسابات والأرصدة", adminProviders: "ربط المزودين وإدارة الكتالوج", adminKeys: "تعطيل أو حذف مفاتيح المستخدمين", crypto: "مراجعة الإيداعات وحالتها", asiacell: "مراجعة طلبات الشحن المحلية", freeAdmin: "تخصيص الخدمات المجانية", giftCodes: "إنشاء وإدارة أكواد الرصيد", notifications: "إرسال تنبيهات موجهة", tickets: "الرد على طلبات المستخدمين", audit: "مراجعة الأحداث الإدارية", theme: "تغيير الاسم والشعار والألوان", navigation: "إضافة أو تعديل أو حذف روابط آمنة", adminSettings: "ضبط إعدادات التشغيل العامة"
    },
    en: {
      dashboard: "Return to your account dashboard", profile: "View account details and tools", language: "Choose language and direction", settings: "Manage account preferences", security: "Manage account protection and security code", services: "Browse services and choose what fits", free: "Use available free offers", orders: "Track orders and their status", actions: "Cancel, speed up, or refill orders", deposit: "Add funds to your wallet", api: "Manage keys and app integrations", transactions: "Review wallet activity", updates: "See the latest platform updates", terms: "Read usage terms and policies", createSite: "Create a free services site", siteManagement: "Manage your site and services", adminPanel: "Overview and operational alerts", adminOrders: "Review orders and statuses", adminUsers: "Manage accounts and balances", adminProviders: "Connect providers and manage catalog", adminKeys: "Disable or remove user API keys", crypto: "Review crypto deposits and status", asiacell: "Review local top-up requests", freeAdmin: "Configure free services", giftCodes: "Create and manage balance codes", notifications: "Send targeted notifications", tickets: "Reply to user requests", audit: "Review administrative events", theme: "Change name, logo, and colors", navigation: "Add, edit, or remove safe links", adminSettings: "Configure general operation settings"
    },
    ru: {
      dashboard: "Вернуться на панель аккаунта", profile: "Данные аккаунта и инструменты", language: "Выбор языка и направления", settings: "Настройки аккаунта", services: "Просмотр и выбор услуг", free: "Доступные бесплатные предложения", orders: "Статусы и отслеживание заказов", actions: "Отмена, ускорение или пополнение", deposit: "Пополнить кошелёк", api: "Ключи и интеграции приложений", transactions: "История операций кошелька", updates: "Последние обновления платформы", terms: "Условия использования", createSite: "Создать бесплатный сайт услуг", siteManagement: "Управление сайтом и услугами", adminPanel: "Обзор и операционные уведомления", adminOrders: "Заказы и их статусы", adminUsers: "Аккаунты и балансы", adminProviders: "Провайдеры и каталог", adminKeys: "Отключение или удаление API-ключей", crypto: "Криптодепозиты и статусы", asiacell: "Локальные заявки на пополнение", freeAdmin: "Настройка бесплатных услуг", giftCodes: "Коды пополнения", notifications: "Целевые уведомления", tickets: "Ответы на обращения", audit: "Административные события", theme: "Имя, логотип и цвета", navigation: "Безопасные ссылки", adminSettings: "Общие настройки работы"
    },
    zh: {
      dashboard: "返回账户面板", profile: "查看账户资料和工具", language: "选择语言和界面方向", settings: "管理账户偏好", services: "浏览并选择合适的服务", free: "使用可用的免费优惠", orders: "查看订单状态和进度", actions: "取消、加速或补发订单", deposit: "为钱包充值", api: "管理密钥和应用集成", transactions: "查看钱包交易", updates: "查看平台最新更新", terms: "阅读使用条款和政策", createSite: "创建免费服务网站", siteManagement: "管理网站和服务", adminPanel: "概览与运营提醒", adminOrders: "查看订单和状态", adminUsers: "管理账户和余额", adminProviders: "连接供应商并管理目录", adminKeys: "停用或删除用户 API 密钥", crypto: "查看加密货币充值", asiacell: "查看本地充值请求", freeAdmin: "配置免费服务", giftCodes: "创建和管理余额码", notifications: "发送定向通知", tickets: "回复用户请求", audit: "查看管理事件", theme: "更改名称、标志和颜色", navigation: "添加、编辑或删除安全链接", adminSettings: "配置常规运行设置"
    },
    hi: {
      dashboard: "खाते के डैशबोर्ड पर लौटें", profile: "खाते का विवरण और टूल देखें", language: "भाषा और दिशा चुनें", settings: "खाते की प्राथमिकताएँ प्रबंधित करें", services: "सेवाएँ देखें और चुनें", free: "उपलब्ध निःशुल्क ऑफ़र उपयोग करें", orders: "ऑर्डर की स्थिति देखें", actions: "ऑर्डर रद्द, तेज़ या रीफिल करें", deposit: "वॉलेट में राशि जोड़ें", api: "कुंजी और ऐप इंटीग्रेशन प्रबंधित करें", transactions: "वॉलेट गतिविधि देखें", updates: "प्लेटफ़ॉर्म के नए अपडेट देखें", terms: "उपयोग की शर्तें पढ़ें", createSite: "निःशुल्क सेवा साइट बनाएँ", siteManagement: "साइट और सेवाएँ प्रबंधित करें", adminPanel: "सारांश और संचालन अलर्ट", adminOrders: "ऑर्डर और स्थिति देखें", adminUsers: "खाते और बैलेंस प्रबंधित करें", adminProviders: "प्रदाता और कैटलॉग प्रबंधित करें", adminKeys: "उपयोगकर्ता API कुंजी बंद या हटाएँ", crypto: "क्रिप्टो जमा देखें", asiacell: "स्थानीय रिचार्ज अनुरोध देखें", freeAdmin: "निःशुल्क सेवाएँ सेट करें", giftCodes: "बैलेंस कोड बनाएँ और प्रबंधित करें", notifications: "लक्षित सूचनाएँ भेजें", tickets: "उपयोगकर्ता अनुरोधों का उत्तर दें", audit: "प्रशासनिक घटनाएँ देखें", theme: "नाम, लोगो और रंग बदलें", navigation: "सुरक्षित लिंक जोड़ें या संपादित करें", adminSettings: "सामान्य संचालन सेटिंग्स"
    }
  };
  const getDescription = (key: string, fallback: string) => sidebarDescriptions[locale]?.[key] || sidebarDescriptions.en[key] || fallback;

  const logout = async () => {
          const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) clearAuthBootstrap();
      router.push("/login");

  };

  const menuItems: MenuItem[] = [
    { type: "link", label: t("sidebar.menu"), description: getDescription("dashboard", "العودة إلى لوحة الحساب"), href: "/dashboard" },
    { type: "link", label: t("sidebar.profile"), description: getDescription("profile", "عرض بيانات الحساب والأدوات"), href: "/profile", icon: User },
    { type: "link", label: t("sidebar.language"), description: getDescription("language", "اختيار لغة المنصة واتجاهها"), href: "/settings/language", icon: Globe2 },
    { type: "link", label: t("sidebar.settings"), description: getDescription("settings", "إدارة تفضيلات الحساب"), href: "/settings", icon: Settings },
    { type: "link", label: "إعدادات الأمان", description: getDescription("security", "إدارة حماية الحساب ورمز الأمان"), href: "/settings/security", icon: Shield },
    { type: "link", label: t("sidebar.services"), description: getDescription("services", "تصفح الخدمات واختر المناسب"), href: "/services", icon: Boxes },
    { type: "link", label: "المجاني والهدايا", description: getDescription("free", "استخدم العروض المجانية المتاحة"), href: "/free-services", icon: Gift, badge: "مجاني", badgeColor: "green" },
    { type: "link", label: t("sidebar.orders"), description: getDescription("orders", "متابعة الطلبات وحالتها"), href: "/orders", icon: ShoppingCart },
    { type: "link", label: t("sidebar.actions"), description: getDescription("actions", "إلغاء أو تسريع أو تعبئة الطلب"), href: "/orders?tab=actions", icon: Zap },
    { type: "link", label: t("sidebar.deposit"), description: getDescription("deposit", "إضافة رصيد إلى المحفظة"), href: "/deposit", icon: Wallet },
    { type: "link", label: "بوابة API", description: getDescription("api", "إدارة المفتاح وربط التطبيقات"), href: "/api-access", icon: KeyRound, badge: "جديد", badgeColor: "gold" },
    { type: "link", label: t("sidebar.transactions"), description: getDescription("transactions", "مراجعة حركات الرصيد"), href: "/transactions", icon: History },
    { type: "link", label: t("sidebar.updates"), description: getDescription("updates", "آخر أخبار وتحديثات المنصة"), href: "/updates", icon: Bell, badge: "جديد" },
    { type: "link", label: t("sidebar.terms"), description: getDescription("terms", "شروط الاستخدام والسياسات"), href: "/terms", icon: FileText },
    { type: "link", label: t("sidebar.createSite"), description: getDescription("createSite", "إنشاء موقع خدمات مجاني"), href: "/reseller", icon: Globe2, badge: "مجاني", badgeColor: "green" },
    { type: "link", label: t("sidebar.siteManagement"), description: getDescription("siteManagement", "إدارة الموقع والخدمات"), href: user?.role === "admin" ? "/admin" : "/site-management", icon: SlidersHorizontal },
    ...customItems.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id).map((item): MenuItem => ({
      type: "link",
      label: customLabel(item),
      description: customDescription(item) || undefined,
      href: item.href,
      icon: customIconMap[item.icon] || Zap,
      badge: item.badge || undefined,
      badgeColor: item.badge_color,
    })),
  ];

  const isActive = (href: string) => {
    return pathname === href.split("?")[0];
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-[80] h-full w-[280px] transform glass-strong shadow-[0_0_80px_-20px_rgba(212,175,55,0.3)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="relative flex h-[200px] flex-col items-center justify-center bg-gradient-to-b from-[var(--color-primary)]/20 to-transparent p-4">
            <button onClick={onClose} className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-zinc-400">
              <X size={18} />
            </button>
            <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-luxe text-[#111] shadow-[0_0_36px_-4px_rgba(255,215,0,0.55)]">
              <User size={36} />
            </div>
            <div className="mt-3 text-center">
              <div className="text-lg font-black text-white">{user?.username || "زائر"}</div>
              <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">
                $ {Number(user?.balance || 0).toFixed(4)}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="mb-2 text-xs font-bold text-zinc-500">{t("sidebar.menu")}</div>
            {menuItems.map((item, idx) => {
              const active = item.type === "link" && isActive(item.href);
              const content = (
                <>
                  <span className="min-w-0">
                    <span className={`block truncate font-bold ${active ? "text-[var(--color-primary)]" : "text-white"}`}>{item.label}</span>
                    {item.description && <span className="mt-0.5 block truncate text-[10px] font-medium leading-4 text-zinc-500">{item.description}</span>}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badgeColor === "green" ? "bg-green-500/20 text-green-400" : "badge-new"}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.icon && <item.icon size={18} className={active ? "text-[var(--color-primary)]" : "text-zinc-400"} />}
                  </div>
                </>
              );

              const className = `flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-[var(--color-surface)] ${active ? "bg-[var(--color-surface)]" : ""}`;

              return item.type === "link" ? (
                <Link key={idx} href={item.href} onClick={onClose} className={className}>
                  {content}
                </Link>
              ) : (
                <button key={idx} onClick={() => { item.action(); }} className={`w-full text-right ${className}`}>
                  {content}
                </button>
              );
            })}

            {user?.role === "admin" && (
              <>
                <div className="mb-2 mt-4 text-xs font-bold text-zinc-500">إدارة المنصة</div>
                {[
                  { label: t("sidebar.adminPanel"), description: getDescription("adminPanel", "نظرة عامة وتنبيهات التشغيل"), href: "/admin", icon: Shield },
                  { label: "مركز الطلبات", description: getDescription("adminOrders", "مراجعة الطلبات وحالاتها"), href: "/admin/orders", icon: ClipboardList },
                  { label: "المستخدمون", description: getDescription("adminUsers", "إدارة الحسابات والأرصدة"), href: "/admin/users", icon: User },
                  { label: "المزودون والخدمات", description: getDescription("adminProviders", "ربط المزودين وإدارة الكتالوج"), href: "/admin/providers", icon: Boxes },
                  { label: "إدارة مفاتيح API", description: getDescription("adminKeys", "تعطيل أو حذف مفاتيح المستخدمين"), href: "/admin/api-keys", icon: KeyRound },
                  { label: "إيداعات الكريبتو", description: getDescription("crypto", "مراجعة الإيداعات وحالتها"), href: "/admin/crypto", icon: Wallet },
                  { label: "شحن Asiacell", description: getDescription("asiacell", "مراجعة طلبات الشحن المحلية"), href: "/admin/asiacell", icon: Wallet },
                  { label: "المجاني والهدايا", description: getDescription("freeAdmin", "تخصيص الخدمات المجانية"), href: "/admin/free-services", icon: Gift },
                  { label: "أكواد الهدايا", description: getDescription("giftCodes", "إنشاء وإدارة أكواد الرصيد"), href: "/admin/gift-codes", icon: Gift },
                  { label: "إشعارات المستخدمين", description: getDescription("notifications", "إرسال تنبيهات موجهة"), href: "/admin/notifications", icon: Bell },
                  { label: "تذاكر الدعم", description: getDescription("tickets", "الرد على طلبات المستخدمين"), href: "/admin/tickets", icon: FileText },
                  { label: "سجل التدقيق", description: getDescription("audit", "مراجعة الأحداث الإدارية"), href: "/admin/audit-log", icon: History },
                  { label: "هوية المنصة", description: getDescription("theme", "تغيير الاسم والشعار والألوان"), href: "/admin/theme", icon: SlidersHorizontal },
                  { label: "منصات الكتالوج", description: "إنشاء أزرار باسم وشعار وخدمات تختارها أنت", href: "/admin/catalog-platforms", icon: Boxes },
                  { label: "الأزرار المخصصة", description: getDescription("navigation", "إضافة أو تعديل أو حذف روابط آمنة"), href: "/admin/navigation", icon: Sparkles },
                  { label: "إعدادات الإدارة", description: getDescription("adminSettings", "ضبط إعدادات التشغيل العامة"), href: "/admin/settings", icon: Settings },
                ].map((item) => {
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`mb-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--color-surface)] ${active ? "bg-[var(--color-surface)]" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className={`block truncate font-bold ${active ? "text-[var(--color-primary)]" : "text-white"}`}>{item.label}</span>
                        {item.description && <span className="mt-0.5 block truncate text-[10px] font-medium leading-4 text-zinc-500">{item.description}</span>}
                      </span>
                      <Icon size={18} className={`shrink-0 ${active ? "text-[var(--color-primary)]" : "text-zinc-400"}`} />
                    </Link>
                  );
                })}
                {adminCustomItems.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id).map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = customIconMap[item.icon] || Zap;
                  return (
                    <Link key={`custom-admin-${item.id}`} href={item.href} onClick={onClose} className={`mb-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--color-surface)] ${active ? "bg-[var(--color-surface)]" : ""}`}>
                      <span className="min-w-0">
                        <span className={`block truncate font-bold ${active ? "text-[var(--color-primary)]" : "text-white"}`}>{customLabel(item)}</span>
                        {customDescription(item) && <span className="mt-0.5 block truncate text-[10px] leading-4 text-zinc-500">{customDescription(item)}</span>}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${customBadgeClass(item.badge_color)}`}>{item.badge}</span>}
                        <Icon size={18} className={active ? "text-[var(--color-primary)]" : "text-zinc-400"} />
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </div>

          {user && (
            <div className="border-t border-[var(--color-border)] p-3">
              <button
                onClick={logout}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-red-400 transition hover:bg-red-500/10"
              >
                <span className="font-bold">{t("sidebar.logout")}</span>
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

    </>
  );
}
